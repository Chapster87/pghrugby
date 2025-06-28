export default {
  name: "formType",
  title: "Form",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
    },
    {
      name: "formFields",
      title: "Form Fields",
      type: "array",
      of: [
        {
          type: "object",
          name: "formField",
          title: "Form Field",
          fields: [
            {
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: "fieldType",
              title: "Field Type",
              type: "string",
              options: {
                list: [
                  { title: "Text", value: "text" },
                  { title: "Email", value: "email" },
                  { title: "Textarea", value: "textarea" },
                  { title: "Select", value: "select" },
                  { title: "Checkbox", value: "checkbox" },
                ],
              },
            },
            {
              name: "required",
              title: "Required",
              type: "boolean",
            },
            {
              name: "options",
              title: "Options",
              type: "array",
              of: [{ type: "string" }],
              hidden: (context: { parent: any }) =>
                context?.parent?.fieldType !== "select",
            },
            {
              name: "fieldName",
              title: "Field Name",
              type: "string",
              description: "The input name attribute.",
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: "placeholder",
              title: "Placeholder",
              type: "string",
              description:
                "Optional. Placeholder text for the input. If left blank, will default to 'Enter' and the Field label.",
            },
          ],
        },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      formFields: "formFields",
    },
    prepare(value: Record<string, any>) {
      return {
        title: value.title,
        subtitle: `Fields: ${
          Array.isArray(value.formFields) ? value.formFields.length : 0
        }`,
      }
    },
  },
}
