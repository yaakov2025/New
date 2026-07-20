import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerList, useSaveCustomer } from "../helpers/useCustomers";
import { useDebounce } from "../helpers/useDebounce";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Search, Plus } from "lucide-react";
import { z } from "zod";
import { schema as customerSchema } from "../endpoints/customers/save_POST.schema";
import styles from "./customers.module.css";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isFetching } = useCustomerList({ search: debouncedSearch });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { mutateAsync: saveCustomer } = useSaveCustomer();

  const form = useForm({
    schema: customerSchema,
    defaultValues: { name: "", email: "", phone: "" }
  });

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    await saveCustomer(values);
    setIsCreateOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> New Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
                <FormItem name="name">
                  <FormLabel>Company / Name</FormLabel>
                  <FormControl><Input placeholder="Customer Name" value={form.values.name} onChange={e => form.setValues(p => ({...p, name: e.target.value}))}/></FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem name="email">
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" value={form.values.email || ""} onChange={e => form.setValues(p => ({...p, email: e.target.value}))}/></FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem name="phone">
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input value={form.values.phone || ""} onChange={e => form.setValues(p => ({...p, phone: e.target.value}))}/></FormControl>
                  <FormMessage />
                </FormItem>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <Input 
            placeholder="Search customers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Contacts</th>
              <th>Properties</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && !data ? (
              <tr><td colSpan={5} className={styles.loadingCell}>Loading...</td></tr>
            ) : data?.customers.length === 0 ? (
              <tr><td colSpan={5} className={styles.emptyCell}>No customers found.</td></tr>
            ) : (
              data?.customers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <Link to={`/customers/${customer.id}`} className={styles.nameLink}>
                      {customer.name}
                    </Link>
                  </td>
                  <td className={styles.metaCell}>{customer.email || "-"}</td>
                  <td className={styles.metaCell}>{customer.phone || "-"}</td>
                  <td className={styles.metaCell}>{customer.contactCount}</td>
                  <td className={styles.metaCell}>{customer.propertyCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}