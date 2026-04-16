import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Phone, Calendar } from "lucide-react";
import { Patient } from "@/hooks/usePatients";

interface RecentPatientsProps {
  patients: Patient[];
}

export function RecentPatients({ patients }: RecentPatientsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="shadow-card border-0 animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Recent Patients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patients.slice(0, 5).map((patient) => (
          <div
            key={patient.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-smooth"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">{patient.name}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Added: {formatDate(patient.created_at)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              {patient.blood_group && (
                <Badge variant="secondary" className="text-xs">
                  {patient.blood_group}
                </Badge>
              )}
              {patient.allergies && (
                <p className="text-xs text-muted-foreground">
                  Allergies: {patient.allergies}
                </p>
              )}
            </div>
          </div>
        ))}

        {patients.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No patients registered yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
