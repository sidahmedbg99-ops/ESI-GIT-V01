from django.urls import path
from .views import LoginView, ChangePasswordView, MeView, TeacherListView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/', MeView.as_view(), name='me'),
    path('teachers/', TeacherListView.as_view(), name='teacher-list'),
]