export type ItemStatus = "open" | "returned";
export type LoanStatus = "open" | "closed";
export type Team = "Bar" | "Billetterie" | "Parking" | "Bassspatrouille" | "Tech" | "Autre";

export type LoanItem = {
  id: string;
  loanId: string;
  itemName: string;
  qtyOut: number;
  qtyIn: number;
  status: ItemStatus;
  note: string | null;
};

export type Loan = {
  id: string;
  borrowerName: string;
  note?: string | null;
  status: LoanStatus;
  openedAt?: string | null;
  closedAt?: string | null;
  matchedItems?: string[]; // utilisé côté recherche
};

export type LoanDetail = Loan & {
  items: LoanItem[];
};

export type Shift = {
  id: string;
  team: Team;
  title: string;
  startAt: string;
  endAt: string;
  capacity: number;
  location?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};