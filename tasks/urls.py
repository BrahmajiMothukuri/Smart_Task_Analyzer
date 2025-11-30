# tasks/urls.py
# Defines routing for the Task Analyzer API.
from django.urls import path
from . import views


urlpatterns = [
    path('analyze/',views.receive_data, name='receive_data'),
    path('app/', views.serve_frontend,name="serve_frontend"),
    path('suggest/',views.receive_request, name='receive_request')
]
