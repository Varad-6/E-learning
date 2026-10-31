/**
 * Utility to determine user authorization for course operations.
 * 
 * Strict Permission Rule:
 * A course can be deleted ONLY by:
 *   a) a user with the Admin role (SYSTEM_ADMIN, HR_ADMIN, ADMIN), or
 *   b) the user who created that course (course.created_by === current user id).
 * 
 * Everyone else (other creators, managers, employees) must NOT see the Delete button 
 * and must NOT be able to delete the course.
 * 
 * For old courses where created_by is empty/null: ONLY Admin can delete/edit them.
 */

export const getCurrentUserId = (): string | null => {
  const storedId = localStorage.getItem('userId') || localStorage.getItem('profileUserId');
  if (storedId) return storedId;

  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(decodeURIComponent(escape(window.atob(base64))));
        if (decoded.user_id) {
          localStorage.setItem('userId', String(decoded.user_id));
          return String(decoded.user_id);
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export const isCurrentUserAdmin = (): boolean => {
  try {
    const rawRolesStr = localStorage.getItem('rawRoles');
    if (rawRolesStr) {
      const rawRoles = JSON.parse(rawRolesStr);
      if (Array.isArray(rawRoles)) {
        const isAdminRole = rawRoles.some((r: any) => {
          const name = typeof r === 'string' ? r : (r?.name || '');
          return ['SYSTEM_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(String(name).toUpperCase());
        });
        if (isAdminRole) return true;
      }
    }
  } catch (e) {
    // ignore
  }

  const role = (localStorage.getItem('isLoggedInRole') || '').trim().toLowerCase();
  if (['admin', 'system_admin', 'hr admin', 'hr_admin', 'system admin'].includes(role)) {
    return true;
  }

  return false;
};

export interface CoursePermissionCheckable {
  id?: string;
  created_by?: string | null;
  creator_name?: string | null;
  creatorName?: string | null;
  can_delete?: boolean;
  can_edit?: boolean;
}

export const canDeleteCourse = (course?: CoursePermissionCheckable | null): boolean => {
  if (!course) return false;

  // 1. Authoritative permission flag from the API response
  if (typeof course.can_delete === 'boolean') {
    return course.can_delete;
  }

  // 2. Administrators can delete any course
  if (isCurrentUserAdmin()) {
    return true;
  }

  // 3. The author/creator who created the course can delete their own course
  const currentUserId = getCurrentUserId();
  if (currentUserId && course.created_by) {
    return String(currentUserId).trim().toLowerCase() === String(course.created_by).trim().toLowerCase();
  }

  // Strict rule: For courses where created_by is empty/null or not owned, ONLY Admin can delete.
  return false;
};

export const canEditCourse = (course?: CoursePermissionCheckable | null): boolean => {
  if (!course) return false;

  // 1. Authoritative permission flag from the API response
  if (typeof course.can_edit === 'boolean') {
    return course.can_edit;
  }

  // 2. Administrators can edit any course
  if (isCurrentUserAdmin()) {
    return true;
  }

  // 3. The author/creator who created the course can edit their own course
  const currentUserId = getCurrentUserId();
  if (currentUserId && course.created_by) {
    return String(currentUserId).trim().toLowerCase() === String(course.created_by).trim().toLowerCase();
  }

  // Strict rule: For courses where created_by is empty/null or not owned, ONLY Admin can edit.
  return false;
};
