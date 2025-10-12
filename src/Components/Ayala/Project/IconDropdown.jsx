import React, { useEffect, useRef, useState } from 'react'

export default function IconDropdown({ icons, selectedIcon, onSelect }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const filteredIcons = icons.filter((icon) =>
        icon.title.toLowerCase().includes(search.toLowerCase())
    );    
  return <>
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="bg-gray-800 text-gray-300 border border-gray-500 text-sm rounded-lg 
                   w-full p-2.5 flex items-center justify-between focus:outline-none"
      >
        {selectedIcon ? (
          <div className="flex items-center gap-2">
            <img
              src={`http://localhost:8000/${selectedIcon.icon}`}
              alt={selectedIcon.title}
              className="w-5 h-5"
            />
            <span>{selectedIcon.title}</span>
          </div>
        ) : (
          <span className="text-gray-400">Choose an icon</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="bg-gray-800 border border-gray-600 rounded-lg mt-2 
                     shadow-md w-full overflow-hidden animate-fadeIn"
        >
          <div className="p-2 border-b border-gray-600">
            <input
              type="text"
              placeholder="Search icon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-700 text-gray-200 text-sm rounded-md p-2 
                         focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredIcons.length > 0 ? (
              filteredIcons.map((icon) => (
                <div
                  key={icon.id}
                  onClick={() => {
                    onSelect(icon);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 
                             cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <img
                    src={`http://localhost:8000/${icon.icon}`}
                    alt={icon.title}
                    className="w-5 h-5"
                  />
                  <span>{icon.title}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-3">No icons found</p>
            )}
          </div>
        </div>
      )}
    </div>
  </>
}
