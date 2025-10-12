import axios from 'axios';
import { useFormik } from 'formik';
import { head, title } from 'framer-motion/client';
import React, { useEffect, useState } from 'react'

export default function AddIcons() {
    async function PostIcon(values){
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('icon', values.icon);
        const {data} = await axios.post('http://127.0.0.1:8000/api/v1/icon', formData,{
            headers: { 'Content-Type': 'multipart/form-data' }}
        );
        console.log(data);
    }
    const formik = useFormik({
        initialValues:{
            title: '',
            icon: ''
        },
        onSubmit: PostIcon
    });

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

 const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
    return <>
        <button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
    >
      Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
    </button>
        <form className="max-w-sm mx-auto *:mt-10 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md" onSubmit={formik.handleSubmit} encType='multipart/form-data'>
            <div className="mb-5">
                <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    title:
                </label>
                <input 
                value={formik.values.title}
                onChange={formik.handleChange}
                type="text" name='title' id="title" className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"  required />
            </div>
            <div className="mb-5">
                <label htmlFor="icon" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    icon
                </label>
                <input 
                onChange={(e)=> formik.setFieldValue('icon', e.currentTarget.files[0])}
                type="file" id="icon" className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light" required />
            </div>
            <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                Add Icon
            </button>
        </form>
    </>
}
