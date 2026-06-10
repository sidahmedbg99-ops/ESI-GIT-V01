from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsAdmin, IsStaff, IsStudent
from users.models import Student, Staff
from admin_panel.models import Resource


def _is_authenticated(request):
    """Returns True if the user is a Student or Staff."""
    return IsStudent().has_permission(request, None) or IsStaff().has_permission(request, None)


def _get_file_url(file_field):
    """Convert relative media path to full URL string."""
    if not file_field:
        return None
    from django.conf import settings
    name = str(file_field)
    if name.startswith('http'):
        return name
    return f"{settings.MEDIA_URL}{name}"


def _serialize(resource, request_user=None, is_admin=False):
    if resource.uploaded_by_student:
        uploader = {'type': 'student', 'name': resource.uploaded_by_student.full_name}
        is_owner = isinstance(request_user, Student) and request_user.CID == resource.uploaded_by_student.CID
    elif resource.uploaded_by_staff:
        uploader = {'type': 'staff', 'name': resource.uploaded_by_staff.full_name}
        is_owner = isinstance(request_user, Staff) and request_user.TID == resource.uploaded_by_staff.TID
    else:
        uploader = None
        is_owner = False

    return {
        'id': resource.id,
        'title': resource.title,
        'description': resource.description,
        'resource_type': 'file' if resource.file else 'link',
        'file_url': _get_file_url(resource.file),
        'link_url': resource.link_url,
        'category': resource.category,
        'is_visible': resource.is_visible,
        'created_at': resource.created_at,
        'uploader': uploader,
        'can_edit': is_admin,
        'can_delete': is_admin or is_owner,
    }


class ResourceListCreateView(APIView):
    """
    GET  /api/resources/           → list (filters: type=file|link, role=staff|student)
    POST /api/resources/           → create (any authenticated user)
    """

    def get(self, request):
        if not _is_authenticated(request):
            return Response({'error': 'Authentication required'}, status=401)

        is_admin = IsAdmin().has_permission(request, None)
        qs = Resource.objects.all() if is_admin else Resource.objects.filter(is_visible=True)

        # Filters
        rtype = request.query_params.get('type')
        if rtype == 'file':
            qs = qs.exclude(file='').exclude(file=None)
        elif rtype == 'link':
            qs = qs.filter(file='') | qs.filter(file=None)
            qs = qs.filter(link_url__isnull=False).exclude(link_url='')

        role = request.query_params.get('role')
        if role == 'staff':
            qs = qs.filter(uploaded_by_staff__isnull=False)
        elif role == 'student':
            qs = qs.filter(uploaded_by_student__isnull=False)

        qs = qs.distinct().select_related('uploaded_by_student', 'uploaded_by_staff')
        user = request.user
        data = [_serialize(r, user, is_admin) for r in qs]
        return Response(data)

    def post(self, request):
        if not _is_authenticated(request):
            return Response({'error': 'Authentication required'}, status=401)

        title = request.data.get('title', '').strip()
        if not title:
            return Response({'error': 'title is required'}, status=400)

        file = request.FILES.get('file')
        link_url = request.data.get('link_url', '').strip()

        if not file and not link_url:
            return Response({'error': 'Provide either a file or a link_url'}, status=400)
        if file and link_url:
            return Response({'error': 'Provide either a file or a link_url, not both'}, status=400)

        kwargs = {
            'title': title,
            'description': request.data.get('description', '').strip(),
            'category': request.data.get('category', '').strip(),
        }
        if file:
            kwargs['file'] = file
        else:
            kwargs['link_url'] = link_url

        user = request.user
        if isinstance(user, Student):
            kwargs['uploaded_by_student'] = user
        else:
            kwargs['uploaded_by_staff'] = user

        resource = Resource.objects.create(**kwargs)
        is_admin = IsAdmin().has_permission(request, None)
        return Response(_serialize(resource, user, is_admin), status=201)


class ResourceDetailView(APIView):
    """
    PATCH  /api/resources/<id>/   → edit (admin only)
    DELETE /api/resources/<id>/   → delete (owner or admin)
    """

    def _get(self, pk):
        try:
            return Resource.objects.select_related(
                'uploaded_by_student', 'uploaded_by_staff'
            ).get(pk=pk)
        except Resource.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not _is_authenticated(request):
            return Response({'error': 'Authentication required'}, status=401)
        if not IsAdmin().has_permission(request, None):
            return Response({'error': 'Admin only'}, status=403)

        resource = self._get(pk)
        if not resource:
            return Response({'error': 'Not found'}, status=404)

        for field in ('title', 'description', 'category'):
            val = request.data.get(field)
            if val is not None:
                setattr(resource, field, val)

        is_visible = request.data.get('is_visible')
        if is_visible is not None:
            resource.is_visible = bool(is_visible)

        new_link = request.data.get('link_url')
        if new_link is not None:
            resource.link_url = new_link

        resource.save()
        return Response(_serialize(resource, request.user, True))

    def delete(self, request, pk):
        if not _is_authenticated(request):
            return Response({'error': 'Authentication required'}, status=401)

        resource = self._get(pk)
        if not resource:
            return Response({'error': 'Not found'}, status=404)

        is_admin = IsAdmin().has_permission(request, None)
        user = request.user
        is_owner = (
            (isinstance(user, Student) and resource.uploaded_by_student
             and user.CID == resource.uploaded_by_student.CID)
            or (isinstance(user, Staff) and resource.uploaded_by_staff
                and user.TID == resource.uploaded_by_staff.TID)
        )

        if not is_admin and not is_owner:
            return Response({'error': 'Not authorized'}, status=403)

        if resource.file:
            resource.file.delete(save=False)
        resource.delete()
        return Response({'message': 'Resource deleted'})
