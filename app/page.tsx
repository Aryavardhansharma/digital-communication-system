import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900">Collaborative Drawing</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Create and join collaborative drawing rooms. Draw shapes in real-time with your team.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Register
            </Button>
          </Link>
          <Link href="/rooms/join?anonymous=true">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Join as Guest
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

