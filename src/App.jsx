
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import Layout from './Layout'
import Home from './Components/Home/Home'
import Project from './Components/Ayala/Project/Project'

function App() {
  const routers = createBrowserRouter([
    {path: '', element: <Layout/>, children: [
    // {index:true, element: <Home/>},
    {index:true, element: <Project/>},
    ]}
  ])
  return <>
    <RouterProvider router={routers}/>
  </>
}

export default App
