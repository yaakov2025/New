import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { GlobalContextProviders } from "./components/_globalContextProviders";
import Page_0 from "./pages/jobs.tsx";
import PageLayout_0 from "./pages/jobs.pageLayout.tsx";
import Page_1 from "./pages/admin.tsx";
import PageLayout_1 from "./pages/admin.pageLayout.tsx";
import Page_2 from "./pages/leads.tsx";
import PageLayout_2 from "./pages/leads.pageLayout.tsx";
import Page_3 from "./pages/login.tsx";
import PageLayout_3 from "./pages/login.pageLayout.tsx";
import Page_4 from "./pages/_index.tsx";
import PageLayout_4 from "./pages/_index.pageLayout.tsx";
import Page_5 from "./pages/settings.tsx";
import PageLayout_5 from "./pages/settings.pageLayout.tsx";
import Page_6 from "./pages/customers.tsx";
import PageLayout_6 from "./pages/customers.pageLayout.tsx";
import Page_7 from "./pages/templates.tsx";
import PageLayout_7 from "./pages/templates.pageLayout.tsx";
import Page_8 from "./pages/jobs.$jobId.tsx";
import PageLayout_8 from "./pages/jobs.$jobId.pageLayout.tsx";
import Page_9 from "./pages/invite.$token.tsx";
import PageLayout_9 from "./pages/invite.$token.pageLayout.tsx";
import Page_10 from "./pages/opportunities.tsx";
import PageLayout_10 from "./pages/opportunities.pageLayout.tsx";
import Page_11 from "./pages/review.$token.tsx";
import PageLayout_11 from "./pages/review.$token.pageLayout.tsx";
import Page_12 from "./pages/customers.$customerId.tsx";
import PageLayout_12 from "./pages/customers.$customerId.pageLayout.tsx";
import Page_13 from "./pages/templates.$templateId.tsx";
import PageLayout_13 from "./pages/templates.$templateId.pageLayout.tsx";

if (!window.requestIdleCallback) {
  window.requestIdleCallback = (cb) => {
    setTimeout(cb, 1);
  };
}

import "./base.css";

const fileNameToRoute = new Map([["./pages/jobs.tsx","/jobs"],["./pages/admin.tsx","/admin"],["./pages/leads.tsx","/leads"],["./pages/login.tsx","/login"],["./pages/_index.tsx","/"],["./pages/settings.tsx","/settings"],["./pages/customers.tsx","/customers"],["./pages/templates.tsx","/templates"],["./pages/jobs.$jobId.tsx","/jobs/:jobId"],["./pages/invite.$token.tsx","/invite/:token"],["./pages/opportunities.tsx","/opportunities"],["./pages/review.$token.tsx","/review/:token"],["./pages/customers.$customerId.tsx","/customers/:customerId"],["./pages/templates.$templateId.tsx","/templates/:templateId"]]);
const fileNameToComponent = new Map([
    ["./pages/jobs.tsx", Page_0],
["./pages/admin.tsx", Page_1],
["./pages/leads.tsx", Page_2],
["./pages/login.tsx", Page_3],
["./pages/_index.tsx", Page_4],
["./pages/settings.tsx", Page_5],
["./pages/customers.tsx", Page_6],
["./pages/templates.tsx", Page_7],
["./pages/jobs.$jobId.tsx", Page_8],
["./pages/invite.$token.tsx", Page_9],
["./pages/opportunities.tsx", Page_10],
["./pages/review.$token.tsx", Page_11],
["./pages/customers.$customerId.tsx", Page_12],
["./pages/templates.$templateId.tsx", Page_13],
  ]);

function makePageRoute(filename: string) {
  const Component = fileNameToComponent.get(filename);
  return <Component />;
}

function toElement({
  trie,
  fileNameToRoute,
  makePageRoute,
}: {
  trie: LayoutTrie;
  fileNameToRoute: Map<string, string>;
  makePageRoute: (filename: string) => React.ReactNode;
}) {
  return [
    ...trie.topLevel.map((filename) => (
      <Route
        key={fileNameToRoute.get(filename)}
        path={fileNameToRoute.get(filename)}
        element={makePageRoute(filename)}
      />
    )),
    ...Array.from(trie.trie.entries()).map(([Component, child], index) => (
      <Route
        key={index}
        element={
          <Component>
            <Outlet />
          </Component>
        }
      >
        {toElement({ trie: child, fileNameToRoute, makePageRoute })}
      </Route>
    )),
  ];
}

type LayoutTrieNode = Map<
  React.ComponentType<{ children: React.ReactNode }>,
  LayoutTrie
>;
type LayoutTrie = { topLevel: string[]; trie: LayoutTrieNode };
function buildLayoutTrie(layouts: {
  [fileName: string]: React.ComponentType<{ children: React.ReactNode }>[];
}): LayoutTrie {
  const result: LayoutTrie = { topLevel: [], trie: new Map() };
  Object.entries(layouts).forEach(([fileName, components]) => {
    let cur: LayoutTrie = result;
    for (const component of components) {
      if (!cur.trie.has(component)) {
        cur.trie.set(component, {
          topLevel: [],
          trie: new Map(),
        });
      }
      cur = cur.trie.get(component)!;
    }
    cur.topLevel.push(fileName);
  });
  return result;
}

function NotFound() {
  return (
    <div>
      <h1>Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>Go back to the <a href="/" style={{ color: 'blue' }}>home page</a>.</p>
    </div>
  );
}

import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType(); // "PUSH" | "REPLACE" | "POP"

  useEffect(() => {
    // Back/forward: keep browser-like behavior
    if (navType === "POP") return;

    // Hash links: let the browser scroll to the anchor
    if (hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash, navType]);

  return null;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <ScrollManager />
      <GlobalContextProviders>
        <Routes>
          {toElement({ trie: buildLayoutTrie({
"./pages/jobs.tsx": PageLayout_0,
"./pages/admin.tsx": PageLayout_1,
"./pages/leads.tsx": PageLayout_2,
"./pages/login.tsx": PageLayout_3,
"./pages/_index.tsx": PageLayout_4,
"./pages/settings.tsx": PageLayout_5,
"./pages/customers.tsx": PageLayout_6,
"./pages/templates.tsx": PageLayout_7,
"./pages/jobs.$jobId.tsx": PageLayout_8,
"./pages/invite.$token.tsx": PageLayout_9,
"./pages/opportunities.tsx": PageLayout_10,
"./pages/review.$token.tsx": PageLayout_11,
"./pages/customers.$customerId.tsx": PageLayout_12,
"./pages/templates.$templateId.tsx": PageLayout_13,
}), fileNameToRoute, makePageRoute })} 
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GlobalContextProviders>
    </BrowserRouter>
  );
}
