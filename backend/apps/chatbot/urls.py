from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat, name='chat'),
    path('sessions/', views.chatbot_sessions, name='chatbot_sessions'),
    path('history/<str:session_key>/', views.chat_history, name='chat_history'),
]
