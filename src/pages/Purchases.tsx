import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackagePlus, ClipboardCheck } from "lucide-react";
import { PurchaseOrders } from "@/components/purchases/PurchaseOrders";
import { GoodsReceivedNotes } from "@/components/purchases/GoodsReceivedNotes";

const Purchases = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Purchases</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and goods received notes
          </p>
        </div>

        <Tabs defaultValue="po" className="w-full">
          <TabsList>
            <TabsTrigger value="po">
              <PackagePlus className="w-4 h-4 mr-2" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="grn">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Goods Received
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="po">
            <PurchaseOrders />
          </TabsContent>
          
          <TabsContent value="grn">
            <GoodsReceivedNotes />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Purchases;
