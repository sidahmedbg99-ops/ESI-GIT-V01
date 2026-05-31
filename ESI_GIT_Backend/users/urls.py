from django.urls import path
from .views import LoginView, ChangePasswordView, MeView, ForgotPasswordView, ResetPasswordConfirmView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/', MeView.as_view(), name='me'),
    path("forgot-password/",                    ForgotPasswordView.as_view()),
    path("reset-password/<uid>/<token>/",       ResetPasswordConfirmView.as_view()),
]