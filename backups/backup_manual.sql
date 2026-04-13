--
-- PostgreSQL database dump
--

\restrict V0AcfXNdfB7yZrP0GNzZ51HcaopJPQdnGFBBaxSRFxBCTL0f7SWTQkRKajPBM3a

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public."AuditAction" OWNER TO postgres;

--
-- Name: BusinessDayStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BusinessDayStatus" AS ENUM (
    'OPEN',
    'CLOSED'
);


ALTER TYPE public."BusinessDayStatus" OWNER TO postgres;

--
-- Name: CostMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CostMethod" AS ENUM (
    'COST_AVG',
    'LAST_PRICE'
);


ALTER TYPE public."CostMethod" OWNER TO postgres;

--
-- Name: CustomerType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CustomerType" AS ENUM (
    'RETAIL',
    'WHOLESALE'
);


ALTER TYPE public."CustomerType" OWNER TO postgres;

--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MovementType" AS ENUM (
    'SALE',
    'RETURN',
    'GRN',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'ADJUSTMENT'
);


ALTER TYPE public."MovementType" OWNER TO postgres;

--
-- Name: POStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."POStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CLOSED'
);


ALTER TYPE public."POStatus" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'TRANSFER',
    'MIXED',
    'INSTAPAY',
    'FAWRY',
    'WALLET'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PAID',
    'PARTIAL',
    'UNPAID'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: PaymentTerm; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentTerm" AS ENUM (
    'CASH',
    'DAYS_15',
    'DAYS_30',
    'DAYS_60',
    'DAYS_CUSTOM'
);


ALTER TYPE public."PaymentTerm" OWNER TO postgres;

--
-- Name: ReturnType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReturnType" AS ENUM (
    'STOCK',
    'DEFECTIVE'
);


ALTER TYPE public."ReturnType" OWNER TO postgres;

--
-- Name: TreasuryType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TreasuryType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public."TreasuryType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    address text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: business_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_days (
    id integer NOT NULL,
    opened_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp(3) without time zone,
    opened_by integer NOT NULL,
    closed_by integer,
    notes text,
    status public."BusinessDayStatus" DEFAULT 'OPEN'::public."BusinessDayStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_days OWNER TO postgres;

--
-- Name: business_days_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_days_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_days_id_seq OWNER TO postgres;

--
-- Name: business_days_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_days_id_seq OWNED BY public.business_days.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    default_retail_margin double precision,
    default_wholesale_margin double precision
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    type public."CustomerType" DEFAULT 'RETAIL'::public."CustomerType" NOT NULL,
    tax_number character varying(50),
    address text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    name_ar character varying(100),
    description text,
    color character varying(20),
    icon character varying(50),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    expense_no character varying(50) NOT NULL,
    category_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    expense_date timestamp(3) without time zone NOT NULL,
    payment_method public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    reference character varying(100),
    notes text,
    attachment_url text,
    is_recurring boolean DEFAULT false NOT NULL,
    recurring_day integer,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: goods_receipt_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goods_receipt_lines (
    id integer NOT NULL,
    goods_receipt_id integer NOT NULL,
    product_id integer NOT NULL,
    qty integer NOT NULL,
    cost numeric(10,2) NOT NULL
);


ALTER TABLE public.goods_receipt_lines OWNER TO postgres;

--
-- Name: goods_receipt_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goods_receipt_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goods_receipt_lines_id_seq OWNER TO postgres;

--
-- Name: goods_receipt_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.goods_receipt_lines_id_seq OWNED BY public.goods_receipt_lines.id;


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goods_receipts (
    id integer NOT NULL,
    grn_no character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    branch_id integer NOT NULL,
    related_po_id integer,
    payment_term public."PaymentTerm" DEFAULT 'CASH'::public."PaymentTerm" NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 14 NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    credit_days integer
);


ALTER TABLE public.goods_receipts OWNER TO postgres;

--
-- Name: goods_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goods_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goods_receipts_id_seq OWNER TO postgres;

--
-- Name: goods_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.goods_receipts_id_seq OWNED BY public.goods_receipts.id;


--
-- Name: item_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_types (
    id integer NOT NULL,
    subcategory_id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    default_retail_margin double precision,
    default_wholesale_margin double precision
);


ALTER TABLE public.item_types OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.item_types_id_seq OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_types_id_seq OWNED BY public.item_types.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    name_en character varying(100) NOT NULL,
    name_ar character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    icon character varying(50),
    route character varying(100),
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pages_id_seq OWNER TO postgres;

--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    sales_invoice_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    payment_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_settings (
    id integer NOT NULL,
    platform character varying(50) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    commission numeric(5,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    icon character varying(10),
    name character varying(100),
    shipping_fee numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.platform_settings OWNER TO postgres;

--
-- Name: platform_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_settings_id_seq OWNER TO postgres;

--
-- Name: platform_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_settings_id_seq OWNED BY public.platform_settings.id;


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    product_id integer NOT NULL,
    old_price numeric(10,2) NOT NULL,
    new_price numeric(10,2) NOT NULL,
    price_type character varying(20) NOT NULL,
    changed_by integer NOT NULL,
    reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_history_id_seq OWNER TO postgres;

--
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- Name: product_audits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_audits (
    id integer NOT NULL,
    product_id integer NOT NULL,
    action public."AuditAction" NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_audits OWNER TO postgres;

--
-- Name: product_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_audits_id_seq OWNER TO postgres;

--
-- Name: product_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_audits_id_seq OWNED BY public.product_audits.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    barcode character varying(100),
    name_en character varying(255) NOT NULL,
    name_ar character varying(255),
    category_id integer,
    brand character varying(255),
    unit character varying(50) DEFAULT 'PCS'::character varying NOT NULL,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    cost_avg numeric(10,2) DEFAULT 0 NOT NULL,
    price_retail numeric(10,2) DEFAULT 0 NOT NULL,
    price_wholesale numeric(10,2) DEFAULT 0 NOT NULL,
    retail_margin double precision,
    wholesale_margin double precision,
    min_qty integer,
    max_qty integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    item_type_id integer,
    color character varying(100),
    cost_method public."CostMethod" DEFAULT 'COST_AVG'::public."CostMethod" NOT NULL,
    size character varying(100),
    supplier_id integer,
    manual_pricing boolean DEFAULT false NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_lines (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    product_id integer NOT NULL,
    qty integer NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.purchase_order_lines OWNER TO postgres;

--
-- Name: purchase_order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_lines_id_seq OWNER TO postgres;

--
-- Name: purchase_order_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_lines_id_seq OWNED BY public.purchase_order_lines.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_no character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    branch_id integer NOT NULL,
    status public."POStatus" DEFAULT 'DRAFT'::public."POStatus" NOT NULL,
    expected_date timestamp(3) without time zone NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: role_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_pages (
    role_id integer NOT NULL,
    page_id integer NOT NULL
);


ALTER TABLE public.role_pages OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_lines (
    id integer NOT NULL,
    sales_invoice_id integer NOT NULL,
    product_id integer NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_discount numeric(10,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    line_total numeric(10,2) NOT NULL,
    pricetype character varying(20)
);


ALTER TABLE public.sales_lines OWNER TO postgres;

--
-- Name: sales_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_lines_id_seq OWNER TO postgres;

--
-- Name: sales_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_lines_id_seq OWNED BY public.sales_lines.id;


--
-- Name: sales_return_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_return_lines (
    id integer NOT NULL,
    return_id integer NOT NULL,
    product_id integer NOT NULL,
    qty_returned integer NOT NULL,
    refund_amount numeric(10,2) NOT NULL,
    return_type public."ReturnType" DEFAULT 'STOCK'::public."ReturnType" NOT NULL
);


ALTER TABLE public.sales_return_lines OWNER TO postgres;

--
-- Name: sales_return_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_return_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_return_lines_id_seq OWNER TO postgres;

--
-- Name: sales_return_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_return_lines_id_seq OWNED BY public.sales_return_lines.id;


--
-- Name: salesinvoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salesinvoices (
    id integer NOT NULL,
    invoiceno character varying(50) NOT NULL,
    branchid integer NOT NULL,
    customerid integer,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    totaltax numeric(10,2) DEFAULT 0 NOT NULL,
    totaldiscount numeric(10,2) DEFAULT 0 NOT NULL,
    discountamount numeric(10,2) DEFAULT 0 NOT NULL,
    platformcommission numeric(10,2) DEFAULT 0 NOT NULL,
    channel character varying(50),
    paymentstatus public."PaymentStatus" DEFAULT 'PAID'::public."PaymentStatus" NOT NULL,
    paymentmethod public."PaymentMethod" NOT NULL,
    notes text,
    createdby integer NOT NULL,
    createdat timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedat timestamp(3) without time zone NOT NULL,
    costofgoods numeric(10,2),
    grossprofit numeric(10,2),
    netprofit numeric(10,2),
    profitmargin numeric(5,2),
    totalrefunded numeric(10,2) DEFAULT 0 NOT NULL,
    netrevenue numeric(10,2),
    shippingfee numeric(10,2) DEFAULT 0 NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    deliverydate timestamp(3) without time zone,
    paidamount numeric(10,2) DEFAULT 0 NOT NULL,
    remainingamount numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.salesinvoices OWNER TO postgres;

--
-- Name: salesinvoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salesinvoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salesinvoices_id_seq OWNER TO postgres;

--
-- Name: salesinvoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salesinvoices_id_seq OWNED BY public.salesinvoices.id;


--
-- Name: salesreturns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salesreturns (
    id integer NOT NULL,
    returnno character varying(50) NOT NULL,
    salesinvoiceid integer NOT NULL,
    branchid integer NOT NULL,
    totalrefund numeric(10,2) DEFAULT 0 NOT NULL,
    reason text,
    createdby integer NOT NULL,
    createdat timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.salesreturns OWNER TO postgres;

--
-- Name: salesreturns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salesreturns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salesreturns_id_seq OWNER TO postgres;

--
-- Name: salesreturns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salesreturns_id_seq OWNED BY public.salesreturns.id;


--
-- Name: stock_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_locations (
    id integer NOT NULL,
    branch_id integer NOT NULL,
    name character varying(255) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stock_locations OWNER TO postgres;

--
-- Name: stock_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_locations_id_seq OWNER TO postgres;

--
-- Name: stock_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_locations_id_seq OWNED BY public.stock_locations.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    product_id integer NOT NULL,
    stock_location_id integer NOT NULL,
    qty_change integer NOT NULL,
    movement_type public."MovementType" NOT NULL,
    ref_table character varying(100),
    ref_id integer,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_movements_id_seq OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    default_retail_margin double precision,
    default_wholesale_margin double precision
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: subcategories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcategories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcategories_id_seq OWNER TO postgres;

--
-- Name: subcategories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcategories_id_seq OWNED BY public.subcategories.id;


--
-- Name: supplier_audits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_audits (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    action public."AuditAction" NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.supplier_audits OWNER TO postgres;

--
-- Name: supplier_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_audits_id_seq OWNER TO postgres;

--
-- Name: supplier_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_audits_id_seq OWNED BY public.supplier_audits.id;


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_payments (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    grn_id integer,
    amount numeric(10,2) NOT NULL,
    payment_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    method public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod"
);


ALTER TABLE public.supplier_payments OWNER TO postgres;

--
-- Name: supplier_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_payments_id_seq OWNER TO postgres;

--
-- Name: supplier_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_payments_id_seq OWNED BY public.supplier_payments.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact character varying(255),
    phone character varying(50),
    email character varying(255),
    address text,
    payment_terms text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: treasury_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.treasury_transactions (
    id integer NOT NULL,
    type public."TreasuryType" NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    purpose character varying(500) NOT NULL,
    notes text,
    transaction_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    is_manual boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.treasury_transactions OWNER TO postgres;

--
-- Name: treasury_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.treasury_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treasury_transactions_id_seq OWNER TO postgres;

--
-- Name: treasury_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.treasury_transactions_id_seq OWNED BY public.treasury_transactions.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    branch_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: business_days id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days ALTER COLUMN id SET DEFAULT nextval('public.business_days_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: goods_receipt_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_lines ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_lines_id_seq'::regclass);


--
-- Name: goods_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipts ALTER COLUMN id SET DEFAULT nextval('public.goods_receipts_id_seq'::regclass);


--
-- Name: item_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types ALTER COLUMN id SET DEFAULT nextval('public.item_types_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: platform_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings ALTER COLUMN id SET DEFAULT nextval('public.platform_settings_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: product_audits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_audits ALTER COLUMN id SET DEFAULT nextval('public.product_audits_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_order_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_lines_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_lines ALTER COLUMN id SET DEFAULT nextval('public.sales_lines_id_seq'::regclass);


--
-- Name: sales_return_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_lines ALTER COLUMN id SET DEFAULT nextval('public.sales_return_lines_id_seq'::regclass);


--
-- Name: salesinvoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesinvoices ALTER COLUMN id SET DEFAULT nextval('public.salesinvoices_id_seq'::regclass);


--
-- Name: salesreturns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesreturns ALTER COLUMN id SET DEFAULT nextval('public.salesreturns_id_seq'::regclass);


--
-- Name: stock_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_locations ALTER COLUMN id SET DEFAULT nextval('public.stock_locations_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: subcategories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories ALTER COLUMN id SET DEFAULT nextval('public.subcategories_id_seq'::regclass);


--
-- Name: supplier_audits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_audits ALTER COLUMN id SET DEFAULT nextval('public.supplier_audits_id_seq'::regclass);


--
-- Name: supplier_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments ALTER COLUMN id SET DEFAULT nextval('public.supplier_payments_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: treasury_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transactions ALTER COLUMN id SET DEFAULT nextval('public.treasury_transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
091ff6fa-5fbc-4a4b-97cd-3de071cb5ad6	d4f901e7c14278fd05b3fa3c1d4b7acb06fa0b57ad52cdbebe48b1dce04b5d1a	2026-04-11 23:00:05.626362+02	20251226230231_init		\N	2026-04-11 23:00:05.626362+02	0
eb0357a1-6c2e-43e3-bdc1-8691bcc3e913	df56f9b8118158d9e9a62f77c1381af950ea51b25604ddd608c64b9ffafc95d4	2026-04-11 23:00:07.717564+02	20251228200417_add_platform_name_icon		\N	2026-04-11 23:00:07.717564+02	0
771d04d3-328e-4a57-bbfa-b0ffa7287115	3b7142572d66d063a7fe74fc0987f31b8f110ca1446aff79fac3a97db920fc35	2026-04-11 23:00:09.737437+02	20260102220553_npx_prisma_migrate_dev		\N	2026-04-11 23:00:09.737437+02	0
21bc9465-67f1-41f8-869a-5fe8721e883a	15f5e1106d92c7c4a758528eb524a325dca07a81c71d53a39d8a4a01ed570f35	2026-04-11 23:00:11.733313+02	20260102221313_add_profit_tracking		\N	2026-04-11 23:00:11.733313+02	0
2b1dd96c-95e2-49e2-b034-075c16db8592	5377e811d14d330557944bef1eb41541f81a2d8019a7ce279177c9c70a478b4a	2026-04-11 23:00:13.818232+02	20260111153801_add_shipping_fee_to_sales		\N	2026-04-11 23:00:13.818232+02	0
c46b694d-ca75-4bf2-830e-29459fcea94f	684a96f44da4fceb7ab571a51ebfa58224019a4f8e4498d5da9ea1df5f93caea	2026-04-11 23:00:25.267527+02	20260114100157_add_missing_payment_columns		\N	2026-04-11 23:00:25.267527+02	0
5d2947d2-3d25-4827-bc4f-58cad19bcfc3	cdef6791e6e4a6422ba177f67b4148ef0dc876c0b12866e5ef62f1d77cf4d83b	2026-04-11 23:00:27.407563+02	20260118131354_add_return_tracking_fields		\N	2026-04-11 23:00:27.407563+02	0
1b8db48d-c56b-4e5e-88be-49efe422f327	b0e3437f9a1e9a968cb22de700de4747e05c2070af74263254ceea61d653e2a5	2026-04-11 23:00:29.438225+02	20260121185731_add_price_type_to_sales_line		\N	2026-04-11 23:00:29.438225+02	0
574ccfa8-525d-44e2-81db-2b640d18ba88	0565e156b889f3f75719ff3119520889eaed477df5278799055d5aba00e330d6	2026-04-11 23:00:31.472062+02	20260121200509_add_page_permissions		\N	2026-04-11 23:00:31.472062+02	0
a8bc1b15-78cb-41f9-9e0e-290f032ef1a0	005aa2500d29ac738e27c88d18b48c096e2611f8787dfb6c3f89abdc4f2325ee	2026-04-11 23:00:33.618278+02	20260205172037_add_margin_columns_to_hierarchy		\N	2026-04-11 23:00:33.618278+02	0
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, name, code, address, active, created_at, updated_at) FROM stdin;
1	Main Branch	BR001	123 Main Street, City	t	2026-04-03 11:43:57.406	2026-04-03 11:43:57.406
\.


--
-- Data for Name: business_days; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_days (id, opened_at, closed_at, opened_by, closed_by, notes, status, created_at, updated_at) FROM stdin;
1	2026-04-06 21:22:57.561	2026-04-06 22:20:46.168	2	2	\N	CLOSED	2026-04-06 21:22:57.561	2026-04-06 22:20:46.17
2	2026-04-06 22:20:48.576	2026-04-07 19:07:28.224	2	2	\N	CLOSED	2026-04-06 22:20:48.576	2026-04-07 19:07:28.225
3	2026-04-07 19:08:07.912	2026-04-07 19:24:40.05	2	2	\N	CLOSED	2026-04-07 19:08:07.912	2026-04-07 19:24:40.051
4	2026-04-07 19:25:01.294	2026-04-07 21:28:47.614	2	2	\N	CLOSED	2026-04-07 19:25:01.294	2026-04-07 21:28:47.616
5	2026-04-07 21:30:08.606	2026-04-07 21:30:59.383	2	2	\N	CLOSED	2026-04-07 21:30:08.606	2026-04-07 21:30:59.384
6	2026-04-07 21:39:19.202	2026-04-07 21:40:05.776	2	2	\N	CLOSED	2026-04-07 21:39:19.202	2026-04-07 21:40:05.778
7	2026-04-11 20:57:18.134	2026-04-11 21:18:54.315	2	2	\N	CLOSED	2026-04-11 20:57:18.134	2026-04-11 21:18:54.316
8	2026-04-11 21:19:09.123	\N	2	\N	\N	OPEN	2026-04-11 21:19:09.123	2026-04-11 21:19:09.123
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, name_ar, active, created_at, updated_at, default_retail_margin, default_wholesale_margin) FROM stdin;
1	Mixed	مختلط	t	2026-04-03 11:43:57.435	2026-04-03 11:43:57.435	\N	\N
2	Defective	تلافيات	t	2026-04-03 11:43:57.437	2026-04-03 11:43:57.437	\N	\N
3	test	لللذ	t	2026-04-03 13:56:25.796	2026-04-03 13:56:25.796	\N	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, name, phone, type, tax_number, address, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, name, name_ar, description, color, icon, active, created_at, updated_at) FROM stdin;
1	RENT	ايجار		#6366f1	Wallet	t	2026-04-06 20:43:12.141	2026-04-06 20:43:12.141
2	كهرباء	electric	\N	#6366f1	Wallet	t	2026-04-07 19:26:12.37	2026-04-07 19:26:12.37
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, expense_no, category_id, amount, description, expense_date, payment_method, reference, notes, attachment_url, is_recurring, recurring_day, created_by, created_at, updated_at) FROM stdin;
1	EXP-202604-0001	1	700.00	إدخال من يومية الصندوق	2026-04-06 00:00:00	CASH	\N		\N	f	\N	2	2026-04-06 22:15:05.255	2026-04-06 22:15:05.255
2	EXP-202604-0002	1	500000.00	إدخال من يومية الصندوق	2026-04-07 00:00:00	CASH	\N		\N	f	\N	2	2026-04-07 19:25:37.371	2026-04-07 19:25:37.371
3	EXP-202604-0003	2	900.00	إدخال من يومية الصندوق	2026-04-07 00:00:00	CASH	\N		\N	f	\N	2	2026-04-07 19:26:13.998	2026-04-07 19:26:13.998
4	EXP-202604-0004	2	500.00	إدخال من يومية الصندوق	2026-04-07 21:30:53.125	CASH	\N		\N	f	\N	2	2026-04-07 21:30:53.142	2026-04-07 21:30:53.142
5	EXP-202604-0005	1	1000.00	إدخال من يومية الصندوق	2026-04-07 21:39:34.037	CASH	\N		\N	f	\N	2	2026-04-07 21:39:34.052	2026-04-07 21:39:34.052
\.


--
-- Data for Name: goods_receipt_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.goods_receipt_lines (id, goods_receipt_id, product_id, qty, cost) FROM stdin;
1	1	1	10	222.00
2	2	2	10	200.00
3	3	3	10	150.00
4	4	4	10	150.00
5	5	2	12	200.00
6	6	1	3	222.00
7	7	4	4	125.00
8	8	4	4	125.00
9	9	2	10	200.00
10	9	4	4	125.00
11	10	4	44	125.00
12	11	5	20	400.00
13	12	3	20	125.00
14	13	2	4	200.00
\.


--
-- Data for Name: goods_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.goods_receipts (id, grn_no, supplier_id, branch_id, related_po_id, payment_term, subtotal, tax_rate, tax_amount, total, notes, created_by, created_at, updated_at, credit_days) FROM stdin;
1	GRN-BR001-20260403-0001	1	1	\N	CASH	2220.00	14.00	310.80	2530.80		2	2026-04-03 13:59:46.321	2026-04-03 13:59:46.321	\N
2	GRN-BR001-20260403-0002	1	1	\N	CASH	2000.00	14.00	280.00	2280.00		2	2026-04-03 14:14:28.75	2026-04-03 14:14:28.75	\N
3	GRN-BR001-20260403-0003	1	1	\N	CASH	1500.00	14.00	210.00	1710.00		2	2026-04-03 14:21:13.126	2026-04-03 14:21:13.126	\N
4	GRN-BR001-20260403-0004	1	1	\N	CASH	1500.00	14.00	210.00	1710.00		2	2026-04-03 14:24:00.492	2026-04-03 14:24:00.492	\N
5	GRN-BR001-20260403-0005	1	1	\N	DAYS_30	2400.00	14.00	336.00	2736.00		2	2026-04-03 15:00:49.324	2026-04-03 15:00:49.324	\N
6	GRN-BR001-20260403-0006	1	1	\N	CASH	666.00	14.00	93.24	759.24		2	2026-04-03 15:01:30.903	2026-04-03 15:01:30.903	\N
7	GRN-BR001-20260403-0007	2	1	\N	CASH	500.00	14.00	70.00	570.00		2	2026-04-03 15:14:10.897	2026-04-03 15:14:10.897	\N
8	GRN-BR001-20260403-0008	2	1	\N	CASH	500.00	15.00	75.00	575.00		2	2026-04-03 15:52:08.942	2026-04-03 15:52:08.942	\N
9	GRN-BR001-20260404-0001	3	1	\N	CASH	2500.00	15.00	375.00	2875.00		2	2026-04-04 12:23:51.068	2026-04-04 12:23:51.068	\N
10	GRN-BR001-20260404-0002	3	1	\N	CASH	5500.00	15.00	825.00	6325.00		2	2026-04-04 12:34:11.073	2026-04-04 12:34:11.073	\N
11	GRN-BR001-20260404-0003	2	1	\N	CASH	8000.00	15.00	1200.00	9200.00		2	2026-04-04 15:57:24.647	2026-04-04 15:57:24.647	\N
12	GRN-BR001-20260407-0001	2	1	\N	DAYS_CUSTOM	2500.00	15.00	375.00	2875.00		2	2026-04-07 18:24:01.548	2026-04-07 18:24:01.548	50
13	GRN-BR001-20260407-0002	4	1	\N	DAYS_CUSTOM	800.00	15.00	120.00	920.00		2	2026-04-07 18:26:55.246	2026-04-07 18:26:55.246	22
\.


--
-- Data for Name: item_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item_types (id, subcategory_id, name, name_ar, active, created_at, updated_at, default_retail_margin, default_wholesale_margin) FROM stdin;
1	1	FSDD		t	2026-04-03 13:57:06.026	2026-04-03 13:58:24.17	0	0
2	1	teeee		t	2026-04-03 14:18:50.617	2026-04-03 14:18:50.617	\N	\N
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pages (id, key, name_en, name_ar, category, icon, route, sort_order, active, created_at) FROM stdin;
6	categories	Categories	التصنيفات	inventory	Tags	/categories	7	t	2026-04-03 11:43:57.475
8	price-management	Price Management	إدارة الأسعار	inventory	DollarSign	/price-management	9	t	2026-04-03 11:43:57.477
9	cost-verification	Cost Verification	التحقق من التكلفة	inventory	CheckCircle	/products/cost-verification	10	t	2026-04-03 11:43:57.478
14	platform-settings	Platform Settings	إعدادات المنصات	admin	Settings	/platform-settings	15	t	2026-04-03 11:43:57.482
1	sales	Sales	المبيعات	transactions	ShoppingCart	/sales	1	t	2026-04-03 11:43:57.468
2	returns	Returns	المرتجعات	transactions	RotateCcw	/returns	2	t	2026-04-03 11:43:57.472
16	customer-accounts	Customer Accounts	حسابات العملاء	transactions	DollarSign	/customer-accounts	3	t	2026-04-04 12:11:57.008
4	receive-goods	Receive Goods	استلام بضاعة	transactions	Package	/goods-receipts	4	t	2026-04-03 11:43:57.473
17	expenses	Expenses	المصروفات	transactions	Wallet	/expenses	5	t	2026-04-04 12:11:57.013
18	treasury	Treasury	الخزينة	transactions	Landmark	/treasury	6	t	2026-04-04 12:11:57.016
5	products	Products	المنتجات	inventory	Box	/products	5	t	2026-04-03 11:43:57.474
20	stock-adjustment	Stock Adjustment	تسوية المخزون	inventory	ClipboardList	/stock-adjustment	7	t	2026-04-04 12:11:57.025
10	customers	Customers	العملاء	people	Users	/customers	8	t	2026-04-03 11:43:57.478
11	suppliers	Suppliers	الموردين	people	Truck	/suppliers	9	t	2026-04-03 11:43:57.479
12	users	Users	المستخدمين	admin	UserCog	/users	10	t	2026-04-03 11:43:57.48
13	roles	Roles & Permissions	الأدوار والصلاحيات	admin	Shield	/roles	11	t	2026-04-03 11:43:57.481
15	reports	Reports	التقارير	admin	BarChart	/reports	12	t	2026-04-03 11:43:57.482
21	business-day	Business Day	يوم العمل	admin	CalendarDays	/business-day	17	t	2026-04-06 21:17:32.966
22	day-cash-sheet	Day Cash Sheet	يومية الصندوق	admin	BookOpen	/day-cash-sheet	18	t	2026-04-06 21:40:05.883
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, sales_invoice_id, amount, payment_method, payment_date, notes, created_by, created_at) FROM stdin;
1	1	560.63	INSTAPAY	2026-04-04 12:20:50.374	Initial payment	2	2026-04-04 12:20:50.374
2	2	1207.50	CARD	2026-04-04 13:03:40.125	Initial payment	2	2026-04-04 13:03:40.125
3	3	934.38	CASH	2026-04-04 13:20:46.271	Initial payment	2	2026-04-04 13:20:46.271
4	4	1250.63	WALLET	2026-04-04 14:27:13.66	Initial payment	2	2026-04-04 14:27:13.66
5	5	560.63	INSTAPAY	2026-04-04 15:56:55.239	Initial payment	2	2026-04-04 15:56:55.239
6	6	8970.00	INSTAPAY	2026-04-07 19:07:02.33	Initial payment	2	2026-04-07 19:07:02.33
7	7	934.38	CARD	2026-04-07 21:30:33.48	Initial payment	2	2026-04-07 21:30:33.48
8	8	747.50	INSTAPAY	2026-04-07 21:39:50.779	Initial payment	2	2026-04-07 21:39:50.779
9	9	560.63	CARD	2026-04-11 21:18:22.496	Initial payment	2	2026-04-11 21:18:22.496
10	10	747.50	CASH	2026-04-11 21:20:04.41	Initial payment	2	2026-04-11 21:20:04.41
11	11	934.38	CARD	2026-04-11 21:42:55.713	Initial payment	2	2026-04-11 21:42:55.713
12	12	373.75	INSTAPAY	2026-04-11 21:42:55.896	Initial payment	1	2026-04-11 21:42:55.896
13	13	765.90	CASH	2026-04-13 13:20:58.428	Initial payment	2	2026-04-13 13:20:58.428
14	14	920.00	CASH	2026-04-13 13:31:20.596	Initial payment	2	2026-04-13 13:31:20.596
15	15	598.00	CASH	2026-04-13 13:33:03.659	Initial payment	2	2026-04-13 13:33:03.659
16	16	560.63	INSTAPAY	2026-04-13 13:37:30.263	Initial payment	2	2026-04-13 13:37:30.263
17	17	373.75	CASH	2026-04-13 13:38:27.806	Initial payment	2	2026-04-13 13:38:27.806
18	18	560.63	CASH	2026-04-13 13:44:08.704	Initial payment	2	2026-04-13 13:44:08.704
19	19	833.75	CASH	2026-04-13 13:45:14.905	Initial payment	2	2026-04-13 13:45:14.905
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, created_at) FROM stdin;
1	products:read	View products	2026-04-03 11:43:57.437
2	products:write	Create/edit products	2026-04-03 11:43:57.442
3	sales:create	Create sales	2026-04-03 11:43:57.442
4	sales:read	View sales	2026-04-03 11:43:57.443
5	stock:read	View stock	2026-04-03 11:43:57.444
6	stock:adjust	Adjust stock levels	2026-04-03 11:43:57.444
7	purchasing:read	View purchases	2026-04-03 11:43:57.445
8	purchasing:write	Create purchases	2026-04-03 11:43:57.445
9	users:manage	Manage users and roles	2026-04-03 11:43:57.446
10	settings:manage	Manage system settings	2026-04-03 11:43:57.447
11	platform:KKKK	Access kkkk marketplace	2026-04-03 14:47:49.457
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_settings (id, platform, tax_rate, commission, active, created_at, updated_at, icon, name, shipping_fee) FROM stdin;
1	kkkk	15.00	0.00	t	2026-04-03 14:47:49.436	2026-04-03 14:47:49.436	🏪	kkkk	0.00
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, product_id, old_price, new_price, price_type, changed_by, reason, created_at) FROM stdin;
\.


--
-- Data for Name: product_audits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_audits (id, product_id, action, old_data, new_data, user_id, created_at) FROM stdin;
1	1	CREATE	\N	{"id": 1, "code": "PROD000001", "cost": 222, "size": null, "unit": "PCS", "brand": "", "color": null, "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "EEE", "barcode": "3232323", "costAvg": 222, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 1, "priceRetail": 122, "priceWholesale": 100}	1	2026-04-03 13:57:55.87
2	1	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 122, "priceWholesale": 100}	{"cost": null, "costAvg": null, "priceRetail": 222, "priceWholesale": 222}	2	2026-04-03 13:59:46.349
3	2	CREATE	\N	{"id": 2, "code": "PROD000002", "cost": 500, "size": "", "unit": "PCS", "brand": "", "color": "", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "TTTT", "barcode": "31323113", "costAvg": 500, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 1, "priceRetail": 570, "priceWholesale": 550}	1	2026-04-03 14:13:52.236
4	2	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 570, "priceWholesale": 550}	{"cost": null, "costAvg": null, "priceRetail": 200, "priceWholesale": 200}	2	2026-04-03 14:14:28.774
5	3	CREATE	\N	{"id": 3, "code": "PROD000003", "cost": 100, "size": "M", "unit": "PCS", "brand": "", "color": "Blue", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "T-Shirt Blue M", "barcode": "TEST-COSTAVG-001", "costAvg": 100, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 130, "priceWholesale": 115}	1	2026-04-03 14:20:26.999
6	3	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 130, "priceWholesale": 115}	{"cost": null, "costAvg": null, "priceRetail": 162.5, "priceWholesale": 143.75}	2	2026-04-03 14:21:13.158
7	4	CREATE	\N	{"id": 4, "code": "PROD000004", "cost": 100, "size": "L", "unit": "PCS", "brand": "", "color": "RED", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "T-Shirt Red L", "barcode": "TEST-LASTPRICE-001", "costAvg": 100, "categoryId": 3, "costMethod": "LAST_PRICE", "itemTypeId": 2, "priceRetail": 130, "priceWholesale": 115}	1	2026-04-03 14:23:32.37
8	4	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 130, "priceWholesale": 115}	{"cost": null, "costAvg": null, "priceRetail": 195, "priceWholesale": 172.5}	2	2026-04-03 14:24:00.52
9	4	UPDATE	{"id": 4, "code": "PROD000004", "cost": 150, "size": "L", "unit": "PCS", "brand": "", "color": "RED", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "T-Shirt Red L", "barcode": "TEST-LASTPRICE-001", "costAvg": 125, "categoryId": 3, "costMethod": "LAST_PRICE", "itemTypeId": 2, "priceRetail": 195, "priceWholesale": 172.5}	{"id": 4, "code": "PROD000004", "cost": 150, "size": "S", "unit": "PCS", "brand": "", "color": "أحمر", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "T-Shirt Red L", "barcode": "TEST-LASTPRICE-001", "costAvg": 125, "categoryId": 3, "costMethod": "LAST_PRICE", "itemTypeId": 2, "priceRetail": 195, "priceWholesale": 172.5}	1	2026-04-03 14:45:42.779
10	4	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 195, "priceWholesale": 172.5}	{"cost": null, "costAvg": null, "priceRetail": 162.5, "priceWholesale": 143.75}	2	2026-04-03 15:14:10.939
11	5	CREATE	\N	{"id": 5, "code": "PROD000005", "cost": 400, "size": "48", "unit": "PCS", "brand": "", "color": "بنفسج", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "testre", "barcode": "323232323232", "costAvg": 400, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 450, "priceWholesale": 420}	1	2026-04-04 13:25:25.054
12	5	UPDATE	{"cost": null, "costAvg": null, "priceRetail": 450, "priceWholesale": 420}	{"cost": null, "costAvg": null, "priceRetail": 520, "priceWholesale": 459.9999999999999}	2	2026-04-04 15:57:24.682
13	5	UPDATE	{"id": 5, "code": "PROD000005", "cost": 400, "size": "48", "unit": "PCS", "brand": "", "color": "بنفسج", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "testre", "barcode": "323232323232", "costAvg": 400, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 520, "priceWholesale": 460}	{"id": 5, "code": "PROD000005", "cost": 400, "size": "48", "unit": "PCS", "brand": "", "color": "بنفسج", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "testre", "barcode": "323232323232", "costAvg": 400, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 520, "priceWholesale": 460}	1	2026-04-07 20:25:06.056
14	5	UPDATE	{"id": 5, "code": "PROD000005", "cost": 400, "size": "48", "unit": "PCS", "brand": "", "color": "بنفسج", "active": true, "maxQty": 15, "minQty": 3, "nameAr": "", "nameEn": "testre", "barcode": "323232323232", "costAvg": 400, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 520, "priceWholesale": 460}	{"id": 5, "code": "PROD000005", "cost": 400, "size": "48", "unit": "PCS", "brand": "", "color": "بنفسج", "active": true, "maxQty": 15, "minQty": 5, "nameAr": "", "nameEn": "testre", "barcode": "323232323232", "costAvg": 400, "categoryId": 3, "costMethod": "COST_AVG", "itemTypeId": 2, "priceRetail": 520, "priceWholesale": 460}	1	2026-04-13 13:33:32.226
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, barcode, name_en, name_ar, category_id, brand, unit, cost, cost_avg, price_retail, price_wholesale, retail_margin, wholesale_margin, min_qty, max_qty, active, created_at, updated_at, item_type_id, color, cost_method, size, supplier_id, manual_pricing) FROM stdin;
1	PROD000001	3232323	EEE		3		PCS	222.00	222.00	222.00	222.00	\N	\N	3	15	t	2026-04-03 13:57:55.861	2026-04-03 15:01:30.916	1	\N	COST_AVG	\N	\N	f
4	PROD000004	TEST-LASTPRICE-001	T-Shirt Red L		3		PCS	125.00	125.00	162.50	143.75	\N	\N	3	15	t	2026-04-03 14:23:32.362	2026-04-04 12:34:11.099	2	أحمر	LAST_PRICE	S	\N	f
3	PROD000003	TEST-COSTAVG-001	T-Shirt Blue M		3		PCS	125.00	125.00	162.50	143.75	\N	\N	3	15	t	2026-04-03 14:20:26.975	2026-04-07 18:24:01.595	2	Blue	COST_AVG	M	\N	f
2	PROD000002	31323113	TTTT		3		PCS	200.00	200.00	200.00	200.00	\N	\N	3	15	t	2026-04-03 14:13:52.218	2026-04-07 18:26:55.268	1		COST_AVG		\N	f
5	PROD000005	323232323232	testre		3		PCS	400.00	400.00	520.00	460.00	\N	\N	5	15	t	2026-04-04 13:25:25.048	2026-04-13 13:33:32.203	2	بنفسج	COST_AVG	48	3	f
\.


--
-- Data for Name: purchase_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_lines (id, purchase_order_id, product_id, qty, price) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, po_no, supplier_id, branch_id, status, expected_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role_pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_pages (role_id, page_id) FROM stdin;
1	1
1	2
1	16
1	4
1	17
1	5
1	18
1	20
1	6
1	10
1	11
1	8
1	9
1	12
1	13
1	15
1	14
1	21
1	22
4	5
4	10
4	1
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
1	1
1	2
1	3
1	4
1	5
1	6
1	7
1	8
1	9
1	10
4	11
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, is_system, created_at, updated_at) FROM stdin;
1	ADMIN	Full system access	t	2026-04-03 11:43:57.447	2026-04-03 11:43:57.447
2	MANAGER	Branch manager	t	2026-04-03 11:43:57.451	2026-04-03 11:43:57.451
3	STOREKEEPER	Inventory management	f	2026-04-03 11:43:57.452	2026-04-03 11:43:57.452
4	CASHIER	POS operations	f	2026-04-03 11:43:57.454	2026-04-11 21:42:37.459
\.


--
-- Data for Name: sales_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_lines (id, sales_invoice_id, product_id, qty, unit_price, line_discount, tax_rate, line_total, pricetype) FROM stdin;
1	1	4	3	162.50	0.00	15.00	560.63	RETAIL
2	2	2	2	200.00	0.00	15.00	460.00	RETAIL
3	2	3	2	162.50	0.00	15.00	373.75	RETAIL
4	2	4	2	162.50	0.00	15.00	373.75	RETAIL
5	3	4	5	162.50	0.00	15.00	934.38	RETAIL
6	4	4	3	162.50	0.00	15.00	560.63	RETAIL
7	4	2	3	200.00	0.00	15.00	690.00	RETAIL
8	5	3	3	162.50	0.00	15.00	560.63	RETAIL
9	6	5	15	520.00	0.00	15.00	8970.00	RETAIL
10	7	4	5	162.50	0.00	15.00	934.38	RETAIL
11	8	3	2	162.50	0.00	15.00	373.75	RETAIL
12	8	4	2	162.50	0.00	15.00	373.75	RETAIL
13	9	4	3	162.50	0.00	15.00	560.63	RETAIL
14	10	3	2	162.50	0.00	15.00	373.75	RETAIL
15	10	4	2	162.50	0.00	15.00	373.75	RETAIL
16	11	4	5	162.50	0.00	15.00	934.38	RETAIL
17	12	3	2	162.50	0.00	15.00	373.75	RETAIL
18	13	1	3	222.00	0.00	15.00	765.90	RETAIL
19	14	2	4	200.00	0.00	15.00	920.00	RETAIL
20	15	5	1	520.00	0.00	15.00	598.00	RETAIL
21	16	3	3	162.50	0.00	15.00	560.63	RETAIL
22	17	3	2	162.50	0.00	15.00	373.75	RETAIL
23	18	3	3	162.50	0.00	15.00	560.63	RETAIL
24	19	3	2	162.50	0.00	15.00	373.75	RETAIL
25	19	2	2	200.00	0.00	15.00	460.00	RETAIL
\.


--
-- Data for Name: sales_return_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_return_lines (id, return_id, product_id, qty_returned, refund_amount, return_type) FROM stdin;
\.


--
-- Data for Name: salesinvoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesinvoices (id, invoiceno, branchid, customerid, subtotal, total, totaltax, totaldiscount, discountamount, platformcommission, channel, paymentstatus, paymentmethod, notes, createdby, createdat, updatedat, costofgoods, grossprofit, netprofit, profitmargin, totalrefunded, netrevenue, shippingfee, delivered, deliverydate, paidamount, remainingamount) FROM stdin;
1	BR001-20260404-0001	1	\N	487.50	560.63	73.13	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	2	2026-04-04 12:20:50.363	2026-04-04 12:20:50.363	375.00	112.50	112.50	20.07	0.00	560.63	0.00	t	2026-04-04 12:20:50.361	560.63	0.00
2	BR001-20260404-0002	1	\N	1050.00	1207.50	157.50	0.00	0.00	0.00	kkkk	PAID	CARD	kkkk - بطاقة	2	2026-04-04 13:03:40.11	2026-04-04 13:03:40.11	900.00	150.00	150.00	12.42	0.00	1207.50	0.00	t	2026-04-04 13:03:40.109	1207.50	0.00
3	BR001-20260404-0003	1	\N	812.50	934.38	121.88	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-04 13:20:46.264	2026-04-04 13:20:46.264	625.00	187.50	187.50	20.07	0.00	934.38	0.00	t	2026-04-04 13:20:46.263	934.38	0.00
4	BR001-20260404-0004	1	\N	1087.50	1250.63	163.13	0.00	0.00	0.00	kkkk	PAID	WALLET	kkkk - محفظة	2	2026-04-04 14:27:13.645	2026-04-04 14:27:13.645	975.00	112.50	112.50	9.00	0.00	1250.63	0.00	t	2026-04-04 14:27:13.642	1250.63	0.00
5	BR001-20260404-0005	1	\N	487.50	560.63	73.13	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	2	2026-04-04 15:56:55.232	2026-04-04 15:56:55.232	375.00	112.50	112.50	20.07	0.00	560.63	0.00	t	2026-04-04 15:56:55.229	560.63	0.00
6	BR001-20260407-0001	1	\N	7800.00	8970.00	1170.00	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	2	2026-04-07 19:07:02.318	2026-04-07 19:07:02.318	6000.00	1800.00	1800.00	20.07	0.00	8970.00	0.00	t	2026-04-07 19:07:02.316	8970.00	0.00
7	BR001-20260407-0002	1	\N	812.50	934.38	121.88	0.00	0.00	0.00	kkkk	PAID	CARD	kkkk - بطاقة	2	2026-04-07 21:30:33.469	2026-04-07 21:30:33.469	625.00	187.50	187.50	20.07	0.00	934.38	0.00	t	2026-04-07 21:30:33.467	934.38	0.00
8	BR001-20260407-0003	1	\N	650.00	747.50	97.50	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	2	2026-04-07 21:39:50.772	2026-04-07 21:39:50.772	500.00	150.00	150.00	20.07	0.00	747.50	0.00	t	2026-04-07 21:39:50.77	747.50	0.00
9	BR001-20260411-0001	1	\N	487.50	560.63	73.13	0.00	0.00	0.00	kkkk	PAID	CARD	kkkk - بطاقة	2	2026-04-11 21:18:22.473	2026-04-11 21:18:22.473	375.00	112.50	112.50	20.07	0.00	560.63	0.00	t	2026-04-11 21:18:22.47	560.63	0.00
10	BR001-20260411-0002	1	\N	650.00	747.50	97.50	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-11 21:20:04.404	2026-04-11 21:20:04.404	500.00	150.00	150.00	20.07	0.00	747.50	0.00	t	2026-04-11 21:20:04.402	747.50	0.00
11	BR001-20260411-0003	1	\N	812.50	934.38	121.88	0.00	0.00	0.00	kkkk	PAID	CARD	kkkk - بطاقة	2	2026-04-11 21:42:55.702	2026-04-11 21:42:55.702	625.00	187.50	187.50	20.07	0.00	934.38	0.00	t	2026-04-11 21:42:55.699	934.38	0.00
12	BR001-20260411-0004	1	\N	325.00	373.75	48.75	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	1	2026-04-11 21:42:55.893	2026-04-11 21:42:55.893	250.00	75.00	75.00	20.07	0.00	373.75	0.00	t	2026-04-11 21:42:55.891	373.75	0.00
13	BR001-20260413-0001	1	\N	666.00	765.90	99.90	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:20:58.414	2026-04-13 13:20:58.414	666.00	0.00	0.00	0.00	0.00	765.90	0.00	t	2026-04-13 13:20:58.412	765.90	0.00
14	BR001-20260413-0002	1	\N	800.00	920.00	120.00	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:31:20.59	2026-04-13 13:31:20.59	800.00	0.00	0.00	0.00	0.00	920.00	0.00	t	2026-04-13 13:31:20.589	920.00	0.00
15	BR001-20260413-0003	1	\N	520.00	598.00	78.00	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:33:03.656	2026-04-13 13:33:03.656	400.00	120.00	120.00	20.07	0.00	598.00	0.00	t	2026-04-13 13:33:03.654	598.00	0.00
16	BR001-20260413-0004	1	\N	487.50	560.63	73.13	0.00	0.00	0.00	kkkk	PAID	INSTAPAY	kkkk - InstaPay	2	2026-04-13 13:37:30.256	2026-04-13 13:37:30.256	375.00	112.50	112.50	20.07	0.00	560.63	0.00	t	2026-04-13 13:37:30.254	560.63	0.00
17	BR001-20260413-0005	1	\N	325.00	373.75	48.75	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:38:27.799	2026-04-13 13:38:27.799	250.00	75.00	75.00	20.07	0.00	373.75	0.00	t	2026-04-13 13:38:27.797	373.75	0.00
18	BR001-20260413-0006	1	\N	487.50	560.63	73.13	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:44:08.697	2026-04-13 13:44:08.697	375.00	112.50	112.50	20.07	0.00	560.63	0.00	t	2026-04-13 13:44:08.695	560.63	0.00
19	BR001-20260413-0007	1	\N	725.00	833.75	108.75	0.00	0.00	0.00	kkkk	PAID	CASH	kkkk - نقدي	2	2026-04-13 13:45:14.9	2026-04-13 13:45:14.9	650.00	75.00	75.00	9.00	0.00	833.75	0.00	t	2026-04-13 13:45:14.898	833.75	0.00
\.


--
-- Data for Name: salesreturns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesreturns (id, returnno, salesinvoiceid, branchid, totalrefund, reason, createdby, createdat) FROM stdin;
\.


--
-- Data for Name: stock_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_locations (id, branch_id, name, active, created_at, updated_at) FROM stdin;
1	1	Main Warehouse	t	2026-04-03 11:43:57.428	2026-04-03 11:43:57.428
2	1	Showroom	t	2026-04-03 11:43:57.432	2026-04-03 11:43:57.432
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_movements (id, product_id, stock_location_id, qty_change, movement_type, ref_table, ref_id, notes, created_by, created_at) FROM stdin;
1	1	1	10	GRN	goods_receipts	1	\N	2	2026-04-03 13:59:46.335
2	2	1	10	GRN	goods_receipts	2	\N	2	2026-04-03 14:14:28.761
3	3	1	10	ADJUSTMENT	\N	\N	رصيد افتتاحي - Initial Stock	1	2026-04-03 14:20:26.981
4	3	1	10	GRN	goods_receipts	3	\N	2	2026-04-03 14:21:13.137
5	4	1	10	ADJUSTMENT	\N	\N	رصيد افتتاحي - Initial Stock	1	2026-04-03 14:23:32.366
6	4	1	10	GRN	goods_receipts	4	\N	2	2026-04-03 14:24:00.497
7	2	1	12	GRN	goods_receipts	5	\N	2	2026-04-03 15:00:49.336
8	1	1	3	GRN	goods_receipts	6	\N	2	2026-04-03 15:01:30.91
9	4	1	4	GRN	goods_receipts	7	\N	2	2026-04-03 15:14:10.911
10	4	1	4	GRN	goods_receipts	8	\N	2	2026-04-03 15:52:08.968
11	4	1	-3	SALE	sales_invoices	1	\N	2	2026-04-04 12:20:50.38
12	2	1	10	GRN	goods_receipts	9	\N	2	2026-04-04 12:23:51.099
13	4	1	4	GRN	goods_receipts	9	\N	2	2026-04-04 12:23:51.103
14	4	1	44	GRN	goods_receipts	10	\N	2	2026-04-04 12:34:11.088
15	2	1	-2	SALE	sales_invoices	2	\N	2	2026-04-04 13:03:40.127
16	3	1	-2	SALE	sales_invoices	2	\N	2	2026-04-04 13:03:40.127
17	4	1	-2	SALE	sales_invoices	2	\N	2	2026-04-04 13:03:40.127
18	4	1	-5	SALE	sales_invoices	3	\N	2	2026-04-04 13:20:46.273
19	4	1	-3	SALE	sales_invoices	4	\N	2	2026-04-04 14:27:13.662
20	2	1	-3	SALE	sales_invoices	4	\N	2	2026-04-04 14:27:13.662
21	3	1	-3	SALE	sales_invoices	5	\N	2	2026-04-04 15:56:55.242
22	5	1	20	GRN	goods_receipts	11	\N	2	2026-04-04 15:57:24.665
23	3	1	20	GRN	goods_receipts	12	\N	2	2026-04-07 18:24:01.577
24	2	1	4	GRN	goods_receipts	13	\N	2	2026-04-07 18:26:55.258
25	5	1	-15	SALE	sales_invoices	6	\N	2	2026-04-07 19:07:02.339
26	4	1	-5	SALE	sales_invoices	7	\N	2	2026-04-07 21:30:33.483
27	3	1	-2	SALE	sales_invoices	8	\N	2	2026-04-07 21:39:50.781
28	4	1	-2	SALE	sales_invoices	8	\N	2	2026-04-07 21:39:50.781
29	4	1	-3	SALE	sales_invoices	9	\N	2	2026-04-11 21:18:22.499
30	3	1	-2	SALE	sales_invoices	10	\N	2	2026-04-11 21:20:04.412
31	4	1	-2	SALE	sales_invoices	10	\N	2	2026-04-11 21:20:04.412
32	4	1	-5	SALE	sales_invoices	11	\N	2	2026-04-11 21:42:55.716
33	3	1	-2	SALE	sales_invoices	12	\N	1	2026-04-11 21:42:55.898
34	1	1	-3	SALE	sales_invoices	13	\N	2	2026-04-13 13:20:58.432
35	2	1	-4	SALE	sales_invoices	14	\N	2	2026-04-13 13:31:20.598
36	5	1	-1	SALE	sales_invoices	15	\N	2	2026-04-13 13:33:03.66
37	3	1	-3	SALE	sales_invoices	16	\N	2	2026-04-13 13:37:30.265
38	3	1	-2	SALE	sales_invoices	17	\N	2	2026-04-13 13:38:27.808
39	3	1	-3	SALE	sales_invoices	18	\N	2	2026-04-13 13:44:08.706
40	3	1	-2	SALE	sales_invoices	19	\N	2	2026-04-13 13:45:14.906
41	2	1	-2	SALE	sales_invoices	19	\N	2	2026-04-13 13:45:14.906
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subcategories (id, category_id, name, name_ar, active, created_at, updated_at, default_retail_margin, default_wholesale_margin) FROM stdin;
1	3	22		t	2026-04-03 13:56:49.438	2026-04-03 13:56:49.438	\N	\N
\.


--
-- Data for Name: supplier_audits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_audits (id, supplier_id, action, old_data, new_data, user_id, created_at) FROM stdin;
1	1	UPDATE	{"id": 1, "name": "DDDDAA", "email": "", "phone": "", "active": true, "address": "", "contact": "AA", "paymentTerms": null}	{"id": 1, "name": "DDDDAA", "email": "", "phone": "", "active": true, "address": "", "contact": "AA", "paymentTerms": null}	2	2026-04-03 15:00:04.501
2	1	DELETE	{"id": 1, "name": "DDDDAA", "email": "", "phone": "", "active": true, "address": "", "contact": "AA", "paymentTerms": null}	\N	2	2026-04-03 15:13:11.744
3	2	CREATE	\N	{"id": 2, "name": "dfdff", "email": "", "phone": "", "active": true, "address": "", "contact": "", "paymentTerms": null}	2	2026-04-03 15:13:24.894
4	2	UPDATE	{"id": 2, "name": "dfdff", "email": "", "phone": "", "active": true, "address": "", "contact": "", "paymentTerms": null}	{"id": 2, "name": "dfdff", "email": "", "phone": "", "active": false, "address": "", "contact": "", "paymentTerms": null}	2	2026-04-04 11:55:04.788
5	2	UPDATE	{"id": 2, "name": "dfdff", "email": "", "phone": "", "active": false, "address": "", "contact": "", "paymentTerms": null}	{"id": 2, "name": "dfdff", "email": "", "phone": "", "active": true, "address": "", "contact": "", "paymentTerms": null}	2	2026-04-04 11:55:07.007
6	3	CREATE	\N	{"id": 3, "name": "qqqqq", "email": "", "phone": "", "active": true, "address": "", "contact": "", "paymentTerms": "CASH"}	2	2026-04-04 12:22:04.407
7	4	CREATE	\N	{"id": 4, "name": "omar", "email": "", "phone": "", "active": true, "address": "", "contact": "", "paymentTerms": "CASH"}	2	2026-04-07 18:26:28.401
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_payments (id, supplier_id, grn_id, amount, payment_date, notes, created_by, created_at, method) FROM stdin;
3	3	10	6325.00	2026-04-04 12:34:11.088	استلام بضاعة - GRN-BR001-20260404-0002	2	2026-04-04 12:34:11.089	CASH
1	2	7	300.00	2026-04-03 00:00:00	\N	2	2026-04-03 15:14:51.686	CASH
2	2	7	270.00	2026-04-03 00:00:00	\N	2	2026-04-03 15:15:03.886	CASH
4	2	11	9200.00	2026-04-04 15:57:24.666	استلام بضاعة - GRN-BR001-20260404-0003	2	2026-04-04 15:57:24.667	CASH
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, contact, phone, email, address, payment_terms, active, created_at, updated_at) FROM stdin;
1	DDDDAA	AA				\N	t	2026-04-03 13:58:53.629	2026-04-03 15:00:04.472
2	dfdff					\N	t	2026-04-03 15:13:24.892	2026-04-04 11:55:06.993
3	qqqqq					CASH	t	2026-04-04 12:22:04.404	2026-04-04 12:22:04.404
4	omar					CASH	t	2026-04-07 18:26:28.396	2026-04-07 18:26:28.396
\.


--
-- Data for Name: treasury_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treasury_transactions (id, type, amount, payment_method, purpose, notes, transaction_date, reference_type, reference_id, is_manual, created_by, created_at, updated_at) FROM stdin;
1	INCOME	10.00	CASH	test insert	\N	2026-04-07 00:00:00	\N	\N	t	1	2026-04-06 22:18:42.342	2026-04-06 22:18:42.342
2	INCOME	1000.00	CASH	وارد — يومية الصندوق		2026-04-06 00:00:00	\N	\N	t	2	2026-04-06 22:20:21.611	2026-04-06 22:20:21.611
3	INCOME	3000000.00	CASH	وارد — يومية الصندوق		2026-04-07 00:00:00	\N	\N	t	2	2026-04-07 19:14:53.4	2026-04-07 19:14:53.4
4	INCOME	1000000.00	CASH	وارد — يومية الصندوق		2026-04-07 19:23:55.311	\N	\N	t	2	2026-04-07 19:23:55.312	2026-04-07 19:23:55.312
5	INCOME	100000.00	CARD	وارد — يومية الصندوق		2026-04-07 19:49:32.939	\N	\N	t	2	2026-04-07 19:49:32.941	2026-04-07 19:49:32.941
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id) FROM stdin;
2	1
1	4
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, branch_id, active, created_at, updated_at) FROM stdin;
2	admin	$2b$10$1xkmg.ShblgB1Qfb2bmZU.Ew3gU6DRhIrRM45R2bMoMH82Wz1fYYy	System Administrator	1	t	2026-04-03 11:43:57.632	2026-04-03 11:43:57.632
1	cashier	$2b$10$2RX17f0uWXTAfC1.QnaC0uPNenxRZU3i95qWJ0cODQQym8faxuTbO	Cashier User	1	t	2026-04-03 11:43:57.568	2026-04-11 21:30:11.485
\.


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branches_id_seq', 1, true);


--
-- Name: business_days_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_days_id_seq', 8, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 3, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, false);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 2, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 5, true);


--
-- Name: goods_receipt_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goods_receipt_lines_id_seq', 14, true);


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.goods_receipts_id_seq', 13, true);


--
-- Name: item_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.item_types_id_seq', 2, true);


--
-- Name: pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pages_id_seq', 22, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 19, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 11, true);


--
-- Name: platform_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.platform_settings_id_seq', 1, true);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_history_id_seq', 1, false);


--
-- Name: product_audits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_audits_id_seq', 14, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 5, true);


--
-- Name: purchase_order_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_lines_id_seq', 1, false);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: sales_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_lines_id_seq', 25, true);


--
-- Name: sales_return_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_return_lines_id_seq', 1, false);


--
-- Name: salesinvoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesinvoices_id_seq', 19, true);


--
-- Name: salesreturns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesreturns_id_seq', 1, false);


--
-- Name: stock_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_locations_id_seq', 2, true);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 41, true);


--
-- Name: subcategories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subcategories_id_seq', 1, true);


--
-- Name: supplier_audits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_audits_id_seq', 7, true);


--
-- Name: supplier_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_payments_id_seq', 4, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 4, true);


--
-- Name: treasury_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.treasury_transactions_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: business_days business_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days
    ADD CONSTRAINT business_days_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_lines goods_receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: item_types item_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: product_audits product_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_audits
    ADD CONSTRAINT product_audits_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: role_pages role_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_pkey PRIMARY KEY (role_id, page_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_lines sales_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_lines
    ADD CONSTRAINT sales_lines_pkey PRIMARY KEY (id);


--
-- Name: sales_return_lines sales_return_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_lines
    ADD CONSTRAINT sales_return_lines_pkey PRIMARY KEY (id);


--
-- Name: salesinvoices salesinvoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesinvoices
    ADD CONSTRAINT salesinvoices_pkey PRIMARY KEY (id);


--
-- Name: salesreturns salesreturns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesreturns
    ADD CONSTRAINT salesreturns_pkey PRIMARY KEY (id);


--
-- Name: stock_locations stock_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_locations
    ADD CONSTRAINT stock_locations_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: supplier_audits supplier_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_audits
    ADD CONSTRAINT supplier_audits_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: treasury_transactions treasury_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transactions
    ADD CONSTRAINT treasury_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: branches_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX branches_code_key ON public.branches USING btree (code);


--
-- Name: business_days_opened_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX business_days_opened_at_idx ON public.business_days USING btree (opened_at);


--
-- Name: business_days_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX business_days_status_idx ON public.business_days USING btree (status);


--
-- Name: customers_phone_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX customers_phone_key ON public.customers USING btree (phone);


--
-- Name: expenses_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expenses_category_id_idx ON public.expenses USING btree (category_id);


--
-- Name: expenses_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expenses_created_by_idx ON public.expenses USING btree (created_by);


--
-- Name: expenses_expense_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expenses_expense_date_idx ON public.expenses USING btree (expense_date);


--
-- Name: expenses_expense_no_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX expenses_expense_no_key ON public.expenses USING btree (expense_no);


--
-- Name: goods_receipts_created_at_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX goods_receipts_created_at_branch_id_idx ON public.goods_receipts USING btree (created_at, branch_id);


--
-- Name: goods_receipts_grn_no_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX goods_receipts_grn_no_key ON public.goods_receipts USING btree (grn_no);


--
-- Name: item_types_subcategory_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX item_types_subcategory_id_idx ON public.item_types USING btree (subcategory_id);


--
-- Name: pages_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pages_key_key ON public.pages USING btree (key);


--
-- Name: payments_payment_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_payment_date_idx ON public.payments USING btree (payment_date);


--
-- Name: payments_sales_invoice_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_sales_invoice_id_idx ON public.payments USING btree (sales_invoice_id);


--
-- Name: permissions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name);


--
-- Name: platform_settings_platform_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX platform_settings_platform_key ON public.platform_settings USING btree (platform);


--
-- Name: price_history_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX price_history_product_id_idx ON public.price_history USING btree (product_id);


--
-- Name: product_audits_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX product_audits_product_id_idx ON public.product_audits USING btree (product_id);


--
-- Name: products_barcode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_barcode_idx ON public.products USING btree (barcode);


--
-- Name: products_barcode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_barcode_key ON public.products USING btree (barcode);


--
-- Name: products_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_code_idx ON public.products USING btree (code);


--
-- Name: products_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code);


--
-- Name: products_item_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_item_type_id_idx ON public.products USING btree (item_type_id);


--
-- Name: products_supplier_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_supplier_id_idx ON public.products USING btree (supplier_id);


--
-- Name: purchase_orders_po_no_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX purchase_orders_po_no_key ON public.purchase_orders USING btree (po_no);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: sales_return_lines_return_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_return_lines_return_type_idx ON public.sales_return_lines USING btree (return_type);


--
-- Name: salesinvoices_createdat_branchid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX salesinvoices_createdat_branchid_idx ON public.salesinvoices USING btree (createdat, branchid);


--
-- Name: salesinvoices_invoiceno_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX salesinvoices_invoiceno_key ON public.salesinvoices USING btree (invoiceno);


--
-- Name: salesreturns_createdat_branchid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX salesreturns_createdat_branchid_idx ON public.salesreturns USING btree (createdat, branchid);


--
-- Name: salesreturns_returnno_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX salesreturns_returnno_key ON public.salesreturns USING btree (returnno);


--
-- Name: stock_movements_product_id_stock_location_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_movements_product_id_stock_location_id_idx ON public.stock_movements USING btree (product_id, stock_location_id);


--
-- Name: stock_movements_ref_table_ref_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_movements_ref_table_ref_id_idx ON public.stock_movements USING btree (ref_table, ref_id);


--
-- Name: subcategories_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subcategories_category_id_idx ON public.subcategories USING btree (category_id);


--
-- Name: supplier_audits_supplier_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_audits_supplier_id_idx ON public.supplier_audits USING btree (supplier_id);


--
-- Name: supplier_payments_grn_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_payments_grn_id_idx ON public.supplier_payments USING btree (grn_id);


--
-- Name: supplier_payments_supplier_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_payments_supplier_id_idx ON public.supplier_payments USING btree (supplier_id);


--
-- Name: treasury_transactions_payment_method_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX treasury_transactions_payment_method_idx ON public.treasury_transactions USING btree (payment_method);


--
-- Name: treasury_transactions_transaction_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX treasury_transactions_transaction_date_idx ON public.treasury_transactions USING btree (transaction_date);


--
-- Name: treasury_transactions_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX treasury_transactions_type_idx ON public.treasury_transactions USING btree (type);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: business_days business_days_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days
    ADD CONSTRAINT business_days_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_days business_days_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days
    ADD CONSTRAINT business_days_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_lines goods_receipt_lines_goods_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goods_receipt_lines goods_receipt_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: item_types item_types_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_sales_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sales_invoice_id_fkey FOREIGN KEY (sales_invoice_id) REFERENCES public.salesinvoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_history price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_audits product_audits_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_audits
    ADD CONSTRAINT product_audits_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_audits product_audits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_audits
    ADD CONSTRAINT product_audits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_item_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_item_type_id_fkey FOREIGN KEY (item_type_id) REFERENCES public.item_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_lines purchase_order_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_pages role_pages_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_pages role_pages_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_pages
    ADD CONSTRAINT role_pages_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales_lines sales_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_lines
    ADD CONSTRAINT sales_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_lines sales_lines_sales_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_lines
    ADD CONSTRAINT sales_lines_sales_invoice_id_fkey FOREIGN KEY (sales_invoice_id) REFERENCES public.salesinvoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales_return_lines sales_return_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_lines
    ADD CONSTRAINT sales_return_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_return_lines sales_return_lines_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_lines
    ADD CONSTRAINT sales_return_lines_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.salesreturns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: salesinvoices salesinvoices_branchid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesinvoices
    ADD CONSTRAINT salesinvoices_branchid_fkey FOREIGN KEY (branchid) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: salesinvoices salesinvoices_createdby_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesinvoices
    ADD CONSTRAINT salesinvoices_createdby_fkey FOREIGN KEY (createdby) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: salesinvoices salesinvoices_customerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesinvoices
    ADD CONSTRAINT salesinvoices_customerid_fkey FOREIGN KEY (customerid) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: salesreturns salesreturns_branchid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesreturns
    ADD CONSTRAINT salesreturns_branchid_fkey FOREIGN KEY (branchid) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: salesreturns salesreturns_createdby_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesreturns
    ADD CONSTRAINT salesreturns_createdby_fkey FOREIGN KEY (createdby) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: salesreturns salesreturns_salesinvoiceid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesreturns
    ADD CONSTRAINT salesreturns_salesinvoiceid_fkey FOREIGN KEY (salesinvoiceid) REFERENCES public.salesinvoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_locations stock_locations_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_locations
    ADD CONSTRAINT stock_locations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_stock_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_stock_location_id_fkey FOREIGN KEY (stock_location_id) REFERENCES public.stock_locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_audits supplier_audits_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_audits
    ADD CONSTRAINT supplier_audits_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_audits supplier_audits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_audits
    ADD CONSTRAINT supplier_audits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: treasury_transactions treasury_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transactions
    ADD CONSTRAINT treasury_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict V0AcfXNdfB7yZrP0GNzZ51HcaopJPQdnGFBBaxSRFxBCTL0f7SWTQkRKajPBM3a

