from rest_framework import serializers
from .models import User, Doctor, Appointment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone', 'birthday', 'medical_history', 'avatar')
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {'read_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ('id', 'name', 'specialization', 'email', 'phone')
        
    def create(self, validated_data):
        doctor = Doctor.objects.create(**validated_data)
        return doctor

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.get_full_name')
    doctor_name = serializers.ReadOnlyField(source='doctor.name')
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())
    date = serializers.DateTimeField()

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'patient_name', 'doctor', 'doctor_name', 'date', 'notes', 'status']
        read_only_fields = ['patient', 'status']

    def create(self, validated_data):
        # Get the current user from the context
        user = self.context['request'].user
        validated_data['patient'] = user
        validated_data['status'] = 'scheduled'
        return super().create(validated_data)

class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'phone', 'birthday', 'medical_history')

    def create(self, validated_data):
        # Generate username from email if not provided
        if 'username' not in validated_data:
            email = validated_data['email']
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            birthday=validated_data.get('birthday'),
            medical_history=validated_data.get('medical_history', '')
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})

