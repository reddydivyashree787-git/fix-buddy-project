from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category_detail'),
    path('subcategories/', views.SubCategoryListView.as_view(), name='subcategory_list'),
    path('subcategories/<int:pk>/', views.SubCategoryDetailView.as_view(), name='subcategory_detail'),
    path('my-services/', views.ProviderServiceListView.as_view(), name='provider_services'),
    path('subcategories/<int:subcategory_id>/providers/', views.providers_by_subcategory, name='providers_by_subcategory'),
    path('search/', views.search_services, name='search_services'),
]
