"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGripVertical,
  faExpand,
  faCompress,
  faTrash,
  faPencilAlt,
  faExpandAlt, // For expanding width
  faCompressAlt, // For compressing width
} from "@fortawesome/free-solid-svg-icons";
import { IBaseWidget } from "./types/dashboard-data.typings";
import { WidgetFactory } from "./widgets/WidgetFactory";

interface EditableWidgetProps {
  widget: IBaseWidget;
  id: string;
  // isExpanded is derived from widget.row_span, so it's removed
  onTogglerow_span: (id: string) => void; // Renamed from onToggleHeight
  onRemoveWidget: (id: string) => void;
  onEditWidget: (id: string) => void;
  onTogglecolumn_span: (id: string) => void;
  isEditMode?: boolean;
}

export function EditableWidget({
  widget,
  id,
  // isExpanded is removed
  onTogglerow_span, // Renamed from onToggleHeight
  onRemoveWidget,
  onEditWidget,
  onTogglecolumn_span,
  isEditMode = true,
}: EditableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    gridRow: `span ${widget.row_span || 1}`,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      data-id={id}
      className={`bg-white shadow-md rounded-xl row-span-${widget.row_span || 1} ${widget.column_span === 2 ? "col-span-2" : "col-span-1"} group relative px-4 py-3 ${
        isEditMode
          ? "border-primary-500/70 dark:border-primary-400/70 rounded-xl border-2 border-dashed shadow-md "
          : ""
      } `}
    >

      {/* Create widget with controls in header instead of overlay */}
      <div className="h-full">
        <WidgetFactory
          widget={widget}
          controls={
            isEditMode ? (
              <div className="ml-1 flex items-center gap-2.5">
                {/* Edit widget button */}
                {/* <button
                  onClick={() => onEditWidget(id)}
                  aria-label="Edit widget"
                  title="Edit widget"
                >
                  <FontAwesomeIcon
                    icon={faPencilAlt}
                    className="h-3 w-3 text-gray-600"
                  />
                </button> */}

                {/* Remove widget button */}
                <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => onRemoveWidget(id)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />  

                {/* Row height control button */}
                <button
                  onClick={() => onTogglerow_span(id)}
                  aria-label={`Change row height (currently ${widget.row_span || 1} row${(widget.row_span || 1) > 1 ? 's' : ''})`}
                  title={`Change row height (currently ${widget.row_span || 1} row${(widget.row_span || 1) > 1 ? 's' : ''})`}
                >
                  <FontAwesomeIcon
                    icon={(widget.row_span || 1) > 1 ? faCompress : faExpand}
                    className="h-3 w-3 text-gray-600 dark:text-gray-300"
                  />
                  <span className="ml-1 text-xs">{widget.row_span || 1}</span>
                </button>

                {/* Toggle column span button */}
                <button
                  onClick={() => onTogglecolumn_span(id)}
                  aria-label={
                    widget.column_span === 2
                      ? "Set to 1 column width"
                      : "Set to 2 columns width"
                  }
                  title={
                    widget.column_span === 2
                      ? "Set to 1 column width"
                      : "Set to 2 columns width"
                  }
                >
                  <FontAwesomeIcon
                    icon={widget.column_span === 2 ? faCompressAlt : faExpandAlt}
                    className="h-3 w-3 text-gray-600"
                  />
                </button>

                <div
                  {...attributes}
                  {...listeners}
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <FontAwesomeIcon
                    icon={faGripVertical}
                    className="h-3 w-3 text-gray-600"
                  />
                </div>
              </div>
            ) : undefined
          }
        />
      </div>
    </motion.div>
  );
}
