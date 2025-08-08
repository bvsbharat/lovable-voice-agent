export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'address'
  | 'date'
  | 'number'
  | 'textarea'
  | 'select';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface AgentFunction {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

export interface AgentConfig {
  id?: string;
  name: string;
  industry: string;
  description: string;
  model: string;
  voice: string;
  prompt: string;
  fields: FormField[];
  tools?: AgentFunction[];
  published?: boolean;
  createdAt?: string;
  publishedAt?: string;
}


