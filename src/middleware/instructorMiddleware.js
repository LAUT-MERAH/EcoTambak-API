exports.isInstructor = (req, res, next) => {
    if (req.user && req.user.role_id === 2) {
        next();
    } else {
        return res.status(403).json({ error: 'You are not allowed to access this!' });
    }
};
