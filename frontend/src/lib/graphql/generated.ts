import gql from 'graphql-tag';
import * as Urql from 'urql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

export type AiReportResult = {
  __typename?: 'AiReportResult';
  html: Scalars['String']['output'];
  insights: Scalars['String']['output'];
  period: Scalars['String']['output'];
  totalOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Float']['output'];
};

export type CategorySales = {
  __typename?: 'CategorySales';
  amount: Scalars['Float']['output'];
  category: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
};

export type CustomerActivity = {
  __typename?: 'CustomerActivity';
  count: Scalars['Int']['output'];
  frequency: Scalars['String']['output'];
};

export type CustomerReport = {
  __typename?: 'CustomerReport';
  activity: Array<CustomerActivity>;
  segments: Array<CustomerSegment>;
};

export type CustomerSegment = {
  __typename?: 'CustomerSegment';
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
  segmentType: Scalars['String']['output'];
};

export type Kunde = {
  __typename?: 'Kunde';
  adresse?: Maybe<Scalars['String']['output']>;
  ePost?: Maybe<Scalars['String']['output']>;
  kundeid: Scalars['Int']['output'];
  kundenavn: Scalars['String']['output'];
  postnr?: Maybe<Scalars['String']['output']>;
  sted?: Maybe<Scalars['String']['output']>;
  telefonnummer?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  generateAiReport: AiReportResult;
};


export type MutationGenerateAiReportArgs = {
  customPrompt?: InputMaybe<Scalars['String']['input']>;
  dataSources?: InputMaybe<Array<Scalars['String']['input']>>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  period?: InputMaybe<Scalars['String']['input']>;
  reportType?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type NutritionStats = {
  __typename?: 'NutritionStats';
  calories: Scalars['Float']['output'];
  carbohydrates: Scalars['Float']['output'];
  fat: Scalars['Float']['output'];
  protein: Scalars['Float']['output'];
};

export type Ordre = {
  __typename?: 'Ordre';
  informasjon?: Maybe<Scalars['String']['output']>;
  kunde: Kunde;
  leveringsdato?: Maybe<Scalars['DateTime']['output']>;
  ordredato: Scalars['DateTime']['output'];
  ordreid: Scalars['Int']['output'];
  produkter: Array<Produkt>;
  totalsum: Scalars['Float']['output'];
};

export type PaymentMethodStats = {
  __typename?: 'PaymentMethodStats';
  method: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
};

export type ProductReport = {
  __typename?: 'ProductReport';
  topProducts: Array<TopProduct>;
};

export type Produkt = {
  __typename?: 'Produkt';
  antall: Scalars['Float']['output'];
  enhet?: Maybe<Scalars['String']['output']>;
  pris: Scalars['Float']['output'];
  produktid: Scalars['Int']['output'];
  produktnavn: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  customerReport: CustomerReport;
  kunder: Array<Kunde>;
  nutritionStats: NutritionStats;
  ordre?: Maybe<Ordre>;
  productReport: ProductReport;
  quickStats: QuickStats;
  salesReport: SalesReport;
};


export type QueryCustomerReportArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKunderArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryNutritionStatsArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOrdreArgs = {
  ordreId: Scalars['Int']['input'];
};


export type QueryProductReportArgs = {
  limit?: Scalars['Int']['input'];
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryQuickStatsArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySalesReportArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};

export type QuickStats = {
  __typename?: 'QuickStats';
  activeCustomers: Scalars['Int']['output'];
  averageOrderValue: Scalars['Float']['output'];
  avgOrderChangePercentage: Scalars['Float']['output'];
  ordersChangePercentage: Scalars['Float']['output'];
  revenueChangePercentage: Scalars['Float']['output'];
  totalOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Float']['output'];
};

export type SalesDataPoint = {
  __typename?: 'SalesDataPoint';
  month: Scalars['String']['output'];
  orders: Scalars['Int']['output'];
  sales: Scalars['Float']['output'];
};

export type SalesReport = {
  __typename?: 'SalesReport';
  categorySales: Array<CategorySales>;
  monthlyData: Array<SalesDataPoint>;
  paymentMethods: Array<PaymentMethodStats>;
};

export type TopProduct = {
  __typename?: 'TopProduct';
  produktid: Scalars['Int']['output'];
  produktnavn: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
};

export type GenerateAiReportMutationVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  reportType?: InputMaybe<Scalars['String']['input']>;
  dataSources?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  customPrompt?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateAiReportMutation = { __typename?: 'Mutation', generateAiReport: { __typename?: 'AiReportResult', html: string, insights: string, period: string, totalOrders: number, totalRevenue: number } };

export type GetQuickStatsQueryVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetQuickStatsQuery = { __typename?: 'Query', quickStats: { __typename?: 'QuickStats', totalRevenue: number, totalOrders: number, activeCustomers: number, averageOrderValue: number, revenueChangePercentage: number, ordersChangePercentage: number, avgOrderChangePercentage: number } };

export type GetSalesReportQueryVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSalesReportQuery = { __typename?: 'Query', salesReport: { __typename?: 'SalesReport', monthlyData: Array<{ __typename?: 'SalesDataPoint', month: string, sales: number, orders: number }>, categorySales: Array<{ __typename?: 'CategorySales', category: string, amount: number, percentage: number }>, paymentMethods: Array<{ __typename?: 'PaymentMethodStats', method: string, percentage: number }> } };

export type GetProductReportQueryVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetProductReportQuery = { __typename?: 'Query', productReport: { __typename?: 'ProductReport', topProducts: Array<{ __typename?: 'TopProduct', produktid: number, produktnavn: string, quantity: number, revenue: number }> } };

export type GetCustomerReportQueryVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCustomerReportQuery = { __typename?: 'Query', customerReport: { __typename?: 'CustomerReport', segments: Array<{ __typename?: 'CustomerSegment', segmentType: string, count: number, percentage: number }>, activity: Array<{ __typename?: 'CustomerActivity', frequency: string, count: number }> } };

export type GetNutritionStatsQueryVariables = Exact<{
  period?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetNutritionStatsQuery = { __typename?: 'Query', nutritionStats: { __typename?: 'NutritionStats', calories: number, protein: number, carbohydrates: number, fat: number } };


export const GenerateAiReportDocument = gql`
    mutation GenerateAiReport($period: String, $startDate: String, $endDate: String, $reportType: String, $dataSources: [String!], $customPrompt: String) {
  generateAiReport(
    period: $period
    startDate: $startDate
    endDate: $endDate
    reportType: $reportType
    dataSources: $dataSources
    customPrompt: $customPrompt
  ) {
    html
    insights
    period
    totalOrders
    totalRevenue
  }
}
    `;

export function useGenerateAiReportMutation() {
  return Urql.useMutation<GenerateAiReportMutation, GenerateAiReportMutationVariables>(GenerateAiReportDocument);
};
export const GetQuickStatsDocument = gql`
    query GetQuickStats($period: String) {
  quickStats(period: $period) {
    totalRevenue
    totalOrders
    activeCustomers
    averageOrderValue
    revenueChangePercentage
    ordersChangePercentage
    avgOrderChangePercentage
  }
}
    `;

export function useGetQuickStatsQuery(options?: Omit<Urql.UseQueryArgs<GetQuickStatsQueryVariables>, 'query'>) {
  return Urql.useQuery<GetQuickStatsQuery, GetQuickStatsQueryVariables>({ query: GetQuickStatsDocument, ...options });
};
export const GetSalesReportDocument = gql`
    query GetSalesReport($period: String) {
  salesReport(period: $period) {
    monthlyData {
      month
      sales
      orders
    }
    categorySales {
      category
      amount
      percentage
    }
    paymentMethods {
      method
      percentage
    }
  }
}
    `;

export function useGetSalesReportQuery(options?: Omit<Urql.UseQueryArgs<GetSalesReportQueryVariables>, 'query'>) {
  return Urql.useQuery<GetSalesReportQuery, GetSalesReportQueryVariables>({ query: GetSalesReportDocument, ...options });
};
export const GetProductReportDocument = gql`
    query GetProductReport($period: String, $limit: Int) {
  productReport(period: $period, limit: $limit) {
    topProducts {
      produktid
      produktnavn
      quantity
      revenue
    }
  }
}
    `;

export function useGetProductReportQuery(options?: Omit<Urql.UseQueryArgs<GetProductReportQueryVariables>, 'query'>) {
  return Urql.useQuery<GetProductReportQuery, GetProductReportQueryVariables>({ query: GetProductReportDocument, ...options });
};
export const GetCustomerReportDocument = gql`
    query GetCustomerReport($period: String) {
  customerReport(period: $period) {
    segments {
      segmentType
      count
      percentage
    }
    activity {
      frequency
      count
    }
  }
}
    `;

export function useGetCustomerReportQuery(options?: Omit<Urql.UseQueryArgs<GetCustomerReportQueryVariables>, 'query'>) {
  return Urql.useQuery<GetCustomerReportQuery, GetCustomerReportQueryVariables>({ query: GetCustomerReportDocument, ...options });
};
export const GetNutritionStatsDocument = gql`
    query GetNutritionStats($period: String) {
  nutritionStats(period: $period) {
    calories
    protein
    carbohydrates
    fat
  }
}
    `;

export function useGetNutritionStatsQuery(options?: Omit<Urql.UseQueryArgs<GetNutritionStatsQueryVariables>, 'query'>) {
  return Urql.useQuery<GetNutritionStatsQuery, GetNutritionStatsQueryVariables>({ query: GetNutritionStatsDocument, ...options });
};