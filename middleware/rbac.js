function requireRoles(...allowedRoles) {
return (req, res, next) => {
if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
const roles = req.user.roles || [];
// Allow if any token role matches, or if the token type matches an allowed role (e.g., type 'admin')
const hasRole = roles.some((r) => allowedRoles.includes(r) || allowedRoles.includes(r?.name));
const typeMatches = req.user.type && allowedRoles.includes(req.user.type);
const ok = hasRole || typeMatches;
if (!ok) return res.status(403).json({ message: 'Forbidden' });
next();
};
}
function requirePermissions(...perms) {
return (req, res, next) => {
if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
const userPerms = req.user.permissions || [];
const roles = req.user.roles || [];
const isAdminRole = roles.includes('admin') || roles.includes('superadmin') || roles.some((r) => r?.name === 'admin' || r?.name === 'superadmin');
const isAdminType = req.user.type === 'admin';
const isPrivileged = isAdminRole || isAdminType;
const ok = isPrivileged || perms.every((p) => userPerms.includes(p));
if (!ok) return res.status(403).json({ message: 'Forbidden' });
next();
};
}
module.exports = { requireRoles, requirePermissions };
