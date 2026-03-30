export interface GcpResource {
  id: string;
  name: string;
  type: string;
  icon: string;
  service: string;
  project: string;
  region: string;
  status: string;
  details: Record<string, string>;
  consoleUrl: string;
}

export interface GcpDiscovery {
  connected: boolean;
  projects: { projectId: string; name: string; state: string; enabledApis: { name: string; title: string }[] }[];
  resources: GcpResource[];
  summary: {
    total: number;
    vms: number;
    functions: number;
    containers: number;
    databases: number;
    storage: number;
  };
  errors?: string[];
}
