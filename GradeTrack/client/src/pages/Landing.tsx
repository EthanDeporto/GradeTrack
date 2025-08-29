import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, BookOpen, Award } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Users,
      title: "Student Management",
      description: "Easily manage student profiles, enrollment, and academic records.",
    },
    {
      icon: TrendingUp,
      title: "Grade Tracking",
      description: "Track student progress with comprehensive grade management tools.",
    },
    {
      icon: BookOpen,
      title: "Assignment Management",
      description: "Create, manage, and track assignments across all your classes.",
    },
    {
      icon: Award,
      title: "Performance Analytics",
      description: "Get insights into student performance with detailed analytics.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5" data-testid="landing-page">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6" data-testid="hero-title">
            Welcome to <span className="text-primary">SchoolTrack</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto" data-testid="hero-description">
            A comprehensive grade tracking and student management system designed for modern educational environments.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-4"
            onClick={() => window.location.href = "/api/login"}
            data-testid="login-button"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center" data-testid={`feature-${index}`}>
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Icon className="h-12 w-12 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4" data-testid="cta-title">
                Ready to streamline your classroom management?
              </h2>
              <p className="text-gray-600 mb-6" data-testid="cta-description">
                Join thousands of educators who trust SchoolTrack to manage their students and grades efficiently.
              </p>
              <Button
                size="lg"
                onClick={() => window.location.href = "/api/login"}
                data-testid="cta-button"
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
