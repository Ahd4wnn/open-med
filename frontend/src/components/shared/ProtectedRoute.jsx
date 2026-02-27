import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, token } = useAuth();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === "doctor") {
            return <Navigate to="/doctor/dashboard" replace />;
        }
        return <Navigate to="/patient/dashboard" replace />;
    }

    return children;
}
