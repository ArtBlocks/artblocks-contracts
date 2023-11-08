import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming you have a Select component
// TODO: Export this from a good place
import { FormBlueprint } from "@artblocks/sdk/src/minters";
import { useWalletClient } from "wagmi";
import { DevTool } from "@hookform/devtools";

type FormBuilderProps = {
  configurationForms: FormBlueprint[];
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  configurationForms,
}) => {
  const { data: walletClient } = useWalletClient();

  if (!walletClient) {
    return null;
  }

  return (
    <div className={"space-y-10"}>
      {configurationForms.map((configForm, idx) => {
        if (configForm.formSchema.format === "button") {
          return (
            <Button
              key={configForm.formSchema.title}
              onClick={() => configForm.handleSubmit({}, walletClient)}
            >
              {configForm.formSchema.title}
            </Button>
          );
        } else {
          return (
            <ConfigurationForm
              key={configForm.formSchema.title}
              configForm={configForm}
            />
          );
        }
      })}
    </div>
  );
};

function ConfigurationForm({ configForm }: { configForm: FormBlueprint }) {
  const { data: walletClient } = useWalletClient();

  const form = useForm({
    resolver: zodResolver(configForm.zodSchema),
    defaultValues: configForm.initialFormValues,
  });

  if (!walletClient) {
    return null;
  }

  return (
    <Form key={configForm.formSchema.title} {...form}>
      <form
        onSubmit={form.handleSubmit(async (formValues) => {
          console.log(formValues);
          await configForm.handleSubmit(formValues, walletClient);
        })}
        className="space-y-4"
      >
        {Object.entries(configForm.formSchema.properties ?? []).map(
          ([key, propSchema]) => {
            const fieldDescription = propSchema.description || "";
            const fieldType = propSchema.type;
            const fieldEnum = propSchema.enum;
            const fieldOneOf = propSchema.oneOf;

            return (
              <FormField
                key={key}
                control={form.control}
                name={key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{propSchema.title}</FormLabel>
                    <FormControl>
                      <>
                        {(fieldType === "string" || fieldType === "integer") &&
                          !fieldEnum &&
                          !fieldOneOf && (
                            <Input
                              type={fieldType === "integer" ? "number" : "text"}
                              placeholder={key}
                              {...field}
                            />
                          )}
                        {fieldType === "string" && fieldEnum && (
                          <Select value={field.value}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={key} {...field} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldEnum.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {fieldType === "string" && fieldOneOf && (
                          <Select value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={key} {...field} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldOneOf.map((option) => (
                                <SelectItem
                                  key={option.const}
                                  value={option.const}
                                >
                                  {option.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </>
                    </FormControl>
                    <FormDescription>{fieldDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          }
        )}
        <Button type="submit">Submit</Button>
        <DevTool control={form.control} />
      </form>
    </Form>
  );
}
