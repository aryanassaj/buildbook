export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-semibold tracking-tight">BuildBook</h1>
          <p className="text-neutral-500 text-sm mt-1">Project documentation platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
