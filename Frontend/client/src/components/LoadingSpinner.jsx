const LoadingSpinner = () => {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Verifying authentication...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;