from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import BookingViewSet, ExpenseViewSet, MeView, RoomAvailabilityView

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path(
        "rooms/availability/",
        RoomAvailabilityView.as_view(),
        name="room-availability",
    ),
    path("", include(router.urls)),
]
