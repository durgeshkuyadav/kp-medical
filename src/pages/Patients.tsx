import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/hooks/usePatients";
import { maskEmail, maskPhone } from "@/lib/maskData";
import { MaskToggle } from "@/components/ui/MaskToggle";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 15;

const Patients = () => {
  const { patients, loading } = usePatients();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const term = search.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.phone || '').includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    );
  }, [patients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading patients...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage patient records and purchase history
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {search ? 'No matching patients found' : 'No patients yet'}
                    </TableCell>
                  </TableRow>
                ) : paginated.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>
                      <MaskToggle maskedValue={maskPhone(patient.phone)} originalValue={patient.phone || 'N/A'} auditResource="patient" auditId={patient.id} auditField="phone" />
                    </TableCell>
                    <TableCell>
                      <MaskToggle maskedValue={maskEmail(patient.email)} originalValue={patient.email || 'N/A'} auditResource="patient" auditId={patient.id} auditField="email" />
                    </TableCell>
                    <TableCell>{patient.blood_group || 'N/A'}</TableCell>
                    <TableCell>{new Date(patient.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Patients;
