"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface HexColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export function HexColorPicker({ color, onChange }: HexColorPickerProps) {
  const [internalColor, setInternalColor] = useState(color)

  useEffect(() => {
    setInternalColor(color)
  }, [color])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setInternalColor(newColor)
    onChange(newColor)
  }

  const presetColors = [
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ffffff",
    "#ff9900",
    "#9900ff",
    "#00ff99",
    "#990000",
    "#009900",
    "#000099",
    "#999999",
    "#555555",
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-md border border-slate-200" style={{ backgroundColor: internalColor }} />
        <input
          type="text"
          value={internalColor}
          onChange={handleChange}
          className="w-20 px-2 py-1 text-sm border rounded"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            className={`w-6 h-6 rounded-md border ${
              presetColor === internalColor ? "ring-2 ring-offset-2 ring-primary" : ""
            }`}
            style={{ backgroundColor: presetColor }}
            onClick={() => {
              setInternalColor(presetColor)
              onChange(presetColor)
            }}
            type="button"
            aria-label={`Select color ${presetColor}`}
          />
        ))}
      </div>
    </div>
  )
}

