
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import Layout from './Layout'
import Home from './Components/Home/Home'
import Project from './Components/Ayala/Project/Project'
import DashbordAddIcons from './Components/Ayala/Project/DashbordAddIcons'
import AddIcons from './Components/Ayala/Project/AddIcons'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Orbite from './Components/Ayala/Project/Orbite'
import Three from './Components/Ayala/Project/Three'

function App() {
  const routers = createBrowserRouter([
    {path: '', element: <Layout/>, children: [
    // {index:true, element: <Home/>},
    {path:'add', element: <DashbordAddIcons/>},
    {path:'addi', element: <AddIcons/>},
    {path:'orbite', element: <Orbite/>},
    {path:'3', element: <Three/>},
    {index:true, element: <Project/>},
    ]}
  ]);
  const queryClient = new QueryClient();
  return <>
  <QueryClientProvider client={queryClient}>
      <RouterProvider router={routers}/>
      <ReactQueryDevtools initialIsOpen={false}/>
  </QueryClientProvider>
  </>
}

export default App
