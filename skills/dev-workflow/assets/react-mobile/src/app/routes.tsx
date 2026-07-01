import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '@/components/layouts/Layout'

const Home = lazy(() => import('@/pages/Home'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <Home />
          </Suspense>
        ),
      },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}