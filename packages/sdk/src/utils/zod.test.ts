import { FormFieldSchema } from "../json-schema";
import { formFieldSchemaToZod } from "./zod";
import { ZodError } from "zod";

describe("formFieldSchemaToZod", () => {
  it("should convert string fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        name: {
          type: "string",
          title: "Name",
          pattern: "^[a-zA-Z]+$",
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(zodSchema.parse({ name: "John" })).toEqual({ name: "John" });
    expect(() => zodSchema.parse({ name: "123" })).toThrow(
      new ZodError([
        {
          validation: "regex",
          code: "invalid_string",
          message: "Invalid format",
          path: ["name"],
        },
      ])
    );
  });

  it("should convert number fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        age: {
          type: "number",
          title: "Age",
          minimum: 18,
          maximum: 120,
          multipleOf: 1,
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(zodSchema.parse({ age: 25 })).toEqual({ age: 25 });
    expect(() => zodSchema.parse({ age: 15 })).toThrow(
      "Number must be greater than or equal to 18"
    );
    expect(() => zodSchema.parse({ age: 150 })).toThrow(
      "Number must be less than or equal to 120"
    );
    expect(() => zodSchema.parse({ age: 18.5 })).toThrow(
      "Number must be a multiple of 1"
    );
  });

  it("should convert integer fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        count: {
          type: "integer",
          title: "Count",
          minimum: 0,
          maximum: 100,
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(zodSchema.parse({ count: 10 })).toEqual({ count: 10 });
    expect(zodSchema.parse({ count: "20" })).toEqual({ count: "20" });
    expect(() => zodSchema.parse({ count: "-5" })).toThrow(
      "Value is too small"
    );
    expect(() => zodSchema.parse({ count: 200 })).toThrow("Value is too big");
    expect(() => zodSchema.parse({ count: "abc" })).toThrow(
      "Expected number, received string"
    );
  });

  it("should convert date-time fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        startDate: {
          type: "string",
          title: "Start Date",
          format: "date-time",
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(zodSchema.parse({ startDate: new Date("2023-06-01") })).toEqual({
      startDate: new Date("2023-06-01"),
    });
    expect(zodSchema.parse({ startDate: "2023-06-01T00:00:00Z" })).toEqual({
      startDate: new Date("2023-06-01T00:00:00Z"),
    });
    expect(() => zodSchema.parse({ startDate: "invalid-date" })).toThrow(
      "Invalid date"
    );
  });

  it("should convert object fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        address: {
          type: "object",
          title: "Address",
          properties: {
            street: {
              type: "string",
              title: "Street",
            },
            city: {
              type: "string",
              title: "City",
            },
          },
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(
      zodSchema.parse({
        address: { street: "123 Main St", city: "New York" },
      })
    ).toEqual({ address: { street: "123 Main St", city: "New York" } });
    expect(() =>
      zodSchema.parse({ address: { street: 123, city: "New York" } })
    ).toThrow("Expected string, received number");
  });

  it("should convert array fields correctly", () => {
    const formFieldSchema: FormFieldSchema = {
      type: "object",
      onChain: false,
      properties: {
        tags: {
          type: "array",
          title: "Tags",
          items: {
            type: "string",
          },
        },
      },
    };

    const zodSchema = formFieldSchemaToZod(formFieldSchema);

    expect(zodSchema.parse({ tags: ["tag1", "tag2"] })).toEqual({
      tags: ["tag1", "tag2"],
    });
    expect(() => zodSchema.parse({ tags: [1, 2, 3] })).toThrow(
      "Expected string, received number"
    );
  });
});
