import { useState } from "react";
import { useDispatch } from "react-redux";
import { updateFieldType } from "../store/graphSlice.js";
import { getAllFieldTypes } from "../utils/fieldTypeMapper.js";

export default function FieldTypeEditor({ fieldName, fieldType, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const allTypes = getAllFieldTypes();

  const handleTypeSelect = (newType) => {
    dispatch(updateFieldType({ fieldName, type: newType }));
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col items-center text-center bg-slate-50 p-2 rounded-lg border-2 border-indigo-300">
      {/* Field Name */}
      <div className="font-semibold text-slate-900 text-xs truncate max-w-[90px] mb-1.5 text-center">
        {fieldName}
      </div>

      {/* Field Type with dropdown */}
      <div className="relative mb-2.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 bg-indigo-500 text-white rounded text-xs font-bold hover:bg-indigo-600 transition cursor-pointer border border-indigo-700 w-24"
        >
          {fieldType}
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-white border border-slate-300 rounded shadow-xl z-50 w-32 max-h-48 overflow-y-auto">
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className={`block w-full text-left px-3 py-2 text-xs hover:bg-slate-100 transition ${
                  type === fieldType ? "bg-indigo-50 font-medium border-l-2 border-indigo-600" : ""
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(fieldName)}
        className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline bg-red-50 px-2 py-0.5 rounded"
      >
        Remove
      </button>
    </div>
  );
}
