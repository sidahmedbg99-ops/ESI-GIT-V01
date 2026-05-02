from django.urls import path
from .views import TaskListCreateView, TaskDetailView, AssignTaskView, UnassignTaskView

urlpatterns = [
    path('',                        TaskListCreateView.as_view(), name='task-list-create'),
    path('<int:task_id>/',           TaskDetailView.as_view(),     name='task-detail'),
    path('<int:task_id>/state/',     TaskDetailView.as_view(),     name='task-state'),
    path('<int:task_id>/assign/',    AssignTaskView.as_view(),     name='task-assign'),
    path('<int:task_id>/unassign/',  UnassignTaskView.as_view(),   name='task-unassign'),
]
