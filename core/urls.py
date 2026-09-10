from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BookingViewSet,
    ExpenseViewSet,
    FinancialSummaryReportView,
    MeView,
    OccupancyReportView,
    RoomAvailabilityView,
)

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
    path(
        "reports/financial-summary/",
        FinancialSummaryReportView.as_view(),
        name="report-financial-summary",
    ),
    path(
        "reports/occupancy/",
        OccupancyReportView.as_view(),
        name="report-occupancy",
    ),
    path("", include(router.urls)),
]
