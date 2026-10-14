export interface CreateServiceOrderDto {
  customerId: string;
  sellerEmployeeId: string;
  quoteId?: string | null;
  commissionRuleId?: string | null;
  total: number;
  commission: number;
  soldAt: string;
  scope: string;
  dueDate: string;
}
