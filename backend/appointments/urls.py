from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    DoctorViewSet, 
    AppointmentViewSet,
    RegistrationView, 
    LoginView,
    LogoutView,
    UserProfileView,
    NewDoctorView,
    NewAppointmentView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('', include(router.urls)),
    path('doctors/new/', NewDoctorView.as_view(), name='new-doctor'),
    path('appointments/new/', NewAppointmentView.as_view(), name='new-appointment'),
    path('register/', RegistrationView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    path('profile/', UserProfileView.as_view(), name='user-profile'),
]

