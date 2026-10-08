import django_filters

from .models import Startup


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class StartupFilter(django_filters.FilterSet):
    industry = CharInFilter(field_name="industry")
    stage = CharInFilter(field_name="stage")
    funding_min = django_filters.NumberFilter(field_name="funding_needed", lookup_expr="gte")
    funding_max = django_filters.NumberFilter(field_name="funding_needed", lookup_expr="lte")
    location = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    has_demo = django_filters.BooleanFilter(method="filter_has_demo")

    class Meta:
        model = Startup
        fields = ["industry", "stage", "funding_min", "funding_max", "location", "has_demo"]

    def filter_has_demo(self, queryset, name, value):
        return queryset.exclude(demo_url="") if value else queryset.filter(demo_url="")
