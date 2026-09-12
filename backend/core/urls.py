from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BookingViewSet,
    ExpenseCategoryViewSet,
    ExpenseViewSet,
    FinancialSummaryReportView,
    GuestViewSet,
    MeView,
    OccupancyReportView,
    RoomAvailabilityView,
    RoomViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")
router.register("expense-categories", ExpenseCategoryViewSet, basename="expense-category")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("guests", GuestViewSet, basename="guest")
router.register("rooms", RoomViewSet, basename="room")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    # Must precede the router include: "availability" would otherwise be
    # captured as a {pk} lookup by RoomViewSet's rooms/<pk>/ route.
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
