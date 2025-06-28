// Sanity schema for a formField type with various HTML input props

export default {
  name: "formFieldType",
  title: "Form Field",
  type: "object",
  fields: [
    {
      name: "label",
      title: "Label",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "name",
      title: "Name",
      type: "string",
      description: "The name attribute for the input element.",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Text", value: "text" },
          { title: "Email", value: "email" },
          { title: "Password", value: "password" },
          { title: "Number", value: "number" },
          { title: "Textarea", value: "textarea" },
          { title: "Select", value: "select" },
          { title: "Checkbox", value: "checkbox" },
          { title: "Radio", value: "radio" },
          { title: "Date", value: "date" },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "placeholder",
      title: "Placeholder",
      type: "string",
    },
    {
      name: "required",
      title: "Required",
      type: "boolean",
      initialValue: false,
    },
    {
      name: "options",
      title: "Options",
      type: "array",
      of: [{ type: "string" }],
      hidden: (context: { parent: any }) =>
        context?.parent?.type !== "select" && context?.parent?.type !== "radio",
      description: "Options for select or radio fields.",
    },
    {
      name: "defaultValue",
      title: "Default Value",
      type: "string",
    },
    {
      name: "helpText",
      title: "Help Text",
      type: "string",
      description: "Helper text to display below the field.",
    },
    {
      name: "minLength",
      title: "Min Length",
      type: "number",
      hidden: (context: { parent: any }) =>
        context?.parent?.type !== "text" &&
        context?.parent?.type !== "textarea",
    },
    {
      name: "maxLength",
      title: "Max Length",
      type: "number",
      hidden: (context: { parent: any }) =>
        context?.parent?.type !== "text" &&
        context?.parent?.type !== "textarea",
    },
    {
      name: "pattern",
      title: "Pattern",
      type: "string",
      description: "Regex pattern for validation.",
      hidden: (context: { parent: any }) =>
        context?.parent?.type !== "text" &&
        context?.parent?.type !== "email" &&
        context?.parent?.type !== "password",
    },
  ],
}
