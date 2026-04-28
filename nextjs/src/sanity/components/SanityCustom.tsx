import React from "react"

export const Heading = (props: any) => {
  const Tag = props.value === "h1-lg" ? "h1" : props.value
  return (
    <Tag className={props.value === "h1-lg" ? "h1-lg" : ""}>
      {props.children}
    </Tag>
  )
}

export const TextAlign = (props: any) => {
  return (
    <div
      style={{ textAlign: props.value ? props.value : "left", width: "100%" }}
    >
      {props.children}
    </div>
  )
}
