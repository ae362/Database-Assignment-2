from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action ,api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
import os
from django.views.decorators.csrf import csrf_exempt
from .models import User, Doctor, Appointment
from .serializers import UserSerializer, DoctorSerializer, AppointmentSerializer, RegistrationSerializer, LoginSerializer

class RegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                username=serializer.validated_data['email'],
                password=serializer.validated_data['password']
            )
            if user:
                login(request, user)
                token, _ = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'user': UserSerializer(user).data
                })
            return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            request.user.auth_token.delete()
            logout(request)
            return Response({"success": "Successfully logged out."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=True, methods=['POST'])
    def avatar(self, request, pk=None):
        user = self.get_object()
        if 'avatar' not in request.FILES:
            return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['avatar']
        if user.avatar:
            if os.path.isfile(user.avatar.path):
                os.remove(user.avatar.path)

        filename = f'avatars/user_{user.id}_{file.name}'
        user.avatar = filename
        path = default_storage.save(filename, ContentFile(file.read()))
        user.save()

        return Response(UserSerializer(user).data)

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Appointment.objects.filter(patient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            if serializer.validated_data['date'] < timezone.now():
                return Response(
                    {"error": "Cannot create appointments in the past"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            doctor = serializer.validated_data['doctor']
            appointment_date = serializer.validated_data['date']
            existing_appointment = Appointment.objects.filter(
                doctor=doctor,
                date__date=appointment_date.date(),
                date__hour=appointment_date.hour,
                date__minute=appointment_date.minute,
                status='scheduled'
            ).first()

            if existing_appointment:
                return Response(
                    {"error": "This time slot is already booked"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.validated_data['status'] = 'scheduled'
            appointment = self.perform_create(serializer)
            
            # Send confirmation email
            try:
                send_mail(
                    'Appointment Confirmation',
                    f'Your appointment with Dr. {doctor.name} has been scheduled for {appointment_date.strftime("%B %d, %Y at %I:%M %p")}.',
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send confirmation email: {str(e)}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        
        if appointment.status != 'scheduled':
            return Response(
                {"error": f"Cannot cancel appointment with status '{appointment.status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        current_time = timezone.now()
        appointment_datetime = timezone.localtime(appointment.date)
        
        if appointment_datetime < current_time:
            return Response(
                {"error": "Cannot cancel past appointments"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_difference = appointment_datetime - current_time
        if time_difference.total_seconds() < 3600:
            return Response(
                {"error": "Cannot cancel appointments less than 1 hour before the scheduled time"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'cancelled'
        appointment.save()
        
        try:
            send_mail(
                'Appointment Cancelled',
                f'Your appointment with Dr. {appointment.doctor.name} on {appointment.date.strftime("%B %d, %Y at %I:%M %p")} has been cancelled.',
                settings.DEFAULT_FROM_EMAIL,
                [appointment.patient.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send cancellation email: {str(e)}")
        
        return Response({
            "message": "Appointment cancelled successfully",
            "status": "cancelled"
        })

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        doctor_id = request.query_params.get('doctor_id')
        date = request.query_params.get('date')

        if not doctor_id or not date:
            return Response(
                {"error": "Both doctor_id and date are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            doctor = Doctor.objects.get(id=doctor_id)
            selected_date = datetime.strptime(date, '%Y-%m-%d').date()
        except (Doctor.DoesNotExist, ValueError):
            return Response(
                {"error": "Invalid doctor_id or date format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        all_slots = []
        start_time = datetime.combine(selected_date, datetime.min.time().replace(hour=9))
        end_time = datetime.combine(selected_date, datetime.min.time().replace(hour=17))

        existing_appointments = Appointment.objects.filter(
            doctor=doctor,
            date__date=selected_date,
            status='scheduled'
        ).values_list('date', flat=True)

        current_slot = start_time
        while current_slot < end_time:
            slot_end = current_slot + timedelta(minutes=30)
            is_available = not any(
                appointment.time() >= current_slot.time() and appointment.time() < slot_end.time()
                for appointment in existing_appointments
            )

            all_slots.append({
                'time': current_slot.strftime('%H:%M'),
                'is_available': is_available
            })
            current_slot += timedelta(minutes=30)

        return Response(all_slots)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response(
                {'error': 'No avatar file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file = request.FILES['avatar']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif']
            if file.content_type not in allowed_types:
                return Response(
                    {'error': 'Unsupported file type. Please upload JPEG, PNG, or GIF'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Delete old avatar if it exists
            if request.user.avatar:
                old_path = request.user.avatar.path
                if os.path.isfile(old_path):
                    os.remove(old_path)

            # Save new avatar
            filename = f'avatars/user_{request.user.id}_{file.name}'
            request.user.avatar = filename
            request.user.save()
            
            # Save the file using default storage
            default_storage.save(filename, ContentFile(file.read()))

            return Response(UserSerializer(request.user).data)
        except Exception as e:
            return Response(
                {'error': f'Failed to upload avatar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class NewAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctors = Doctor.objects.all()
        
        return Response({
            "message": "Ready to create new appointment",
            "fields": [
                {"name": "doctor", "type": "select", "required": True},
                {"name": "date", "type": "date", "required": True},
                {"name": "time", "type": "time", "required": True},
                {"name": "notes", "type": "text", "required": False}
            ],
            "doctors": DoctorSerializer(doctors, many=True).data,
        })

    def post(self, request):
        date = request.data.get('date')
        time = request.data.get('time')

        if not date or not time:
            return Response(
                {"error": "Both date and time are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment_datetime = timezone.make_aware(
                datetime.strptime(f"{date} {time}", '%Y-%m-%d %H:%M')
            )
        except ValueError:
            return Response(
                {"error": "Invalid date or time format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.data['date'] = appointment_datetime
        request.data['patient'] = request.user.id

        serializer = AppointmentSerializer(data=request.data)
        if serializer.is_valid():
            if appointment_datetime < timezone.now():
                return Response(
                    {"error": "Cannot create appointments in the past"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            existing_appointment = Appointment.objects.filter(
                doctor=serializer.validated_data['doctor'],
                date=appointment_datetime,
                status='scheduled'
            ).exists()

            if existing_appointment:
                return Response(
                    {"error": "This time slot is already booked"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            appointment = serializer.save()
            
            # Send confirmation email
            try:
                send_mail(
                    'Appointment Confirmation',
                    f'Your appointment with Dr. {appointment.doctor.name} has been scheduled for {appointment_datetime.strftime("%B %d, %Y at %I:%M %p")}.',
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send confirmation email: {str(e)}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NewDoctorView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "message": "Ready to create new doctor",
            "fields": [
                {"name": "name", "type": "string", "required": True},
                {"name": "specialization", "type": "string", "required": True},
                {"name": "email", "type": "email", "required": True},
                {"name": "phone", "type": "string", "required": True}
            ]
        })

    def post(self, request):
        serializer = DoctorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def send_appointment_reminders():
    tomorrow = timezone.now().date() + timedelta(days=1)
    appointments = Appointment.objects.filter(date__date=tomorrow, status='scheduled')
    
    for appointment in appointments:
        try:
            send_mail(
                'Appointment Reminder',
                f'You have an appointment with Dr. {appointment.doctor.name} tomorrow at {appointment.date.strftime("%I:%M %p")}.',
                settings.DEFAULT_FROM_EMAIL,
                [appointment.patient.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send reminder for appointment {appointment.id}: {str(e)}")

