import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SuppliersList } from "@/components/suppliers/SuppliersList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Suppliers = () => {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage supplier information, contacts, and GST details
          </p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <SuppliersList searchFilter={search} />
      </div>
    </MainLayout>
  );
};

export default Suppliers;
