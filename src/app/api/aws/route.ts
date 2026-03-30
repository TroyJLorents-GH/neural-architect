import { NextResponse } from "next/server";
import { LambdaClient, ListFunctionsCommand, type FunctionConfiguration } from "@aws-sdk/client-lambda";
import { EC2Client, DescribeInstancesCommand, type Reservation } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { RDSClient, DescribeDBInstancesCommand, type DBInstance } from "@aws-sdk/client-rds";

const region = process.env.AWS_REGION || "us-west-2";
const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  : undefined;

interface AwsResource {
  id: string;
  name: string;
  type: string;
  icon: string;
  service: string;
  region: string;
  status: string;
  details: Record<string, string>;
  consoleUrl: string;
}

export async function GET() {
  if (!credentials) {
    return NextResponse.json({
      connected: false,
      resources: [],
      error: "AWS credentials not configured",
    });
  }

  const resources: AwsResource[] = [];
  const errors: string[] = [];

  // Fetch all resource types in parallel
  const results = await Promise.allSettled([
    // Lambda Functions
    (async () => {
      const client = new LambdaClient({ region, credentials });
      const resp = await client.send(new ListFunctionsCommand({}));
      for (const fn of resp.Functions || []) {
        resources.push({
          id: fn.FunctionArn || fn.FunctionName || "",
          name: fn.FunctionName || "Unknown",
          type: "function",
          icon: "⚡",
          service: "Lambda",
          region: region,
          status: fn.State || "Active",
          details: {
            runtime: fn.Runtime || "unknown",
            memory: `${fn.MemorySize || 128}MB`,
            timeout: `${fn.Timeout || 3}s`,
            lastModified: fn.LastModified || "",
          },
          consoleUrl: `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${fn.FunctionName}`,
        });
      }
    })(),

    // EC2 Instances
    (async () => {
      const client = new EC2Client({ region, credentials });
      const resp = await client.send(new DescribeInstancesCommand({}));
      for (const reservation of (resp.Reservations || []) as Reservation[]) {
        for (const inst of reservation.Instances || []) {
          const nameTag = inst.Tags?.find((t) => t.Key === "Name");
          resources.push({
            id: inst.InstanceId || "",
            name: nameTag?.Value || inst.InstanceId || "Unknown",
            type: "vm",
            icon: "🖥️",
            service: "EC2",
            region: region,
            status: inst.State?.Name || "unknown",
            details: {
              instanceType: inst.InstanceType || "",
              publicIp: inst.PublicIpAddress || "none",
              privateIp: inst.PrivateIpAddress || "",
              launchTime: inst.LaunchTime?.toISOString() || "",
            },
            consoleUrl: `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#InstanceDetails:instanceId=${inst.InstanceId}`,
          });
        }
      }
    })(),

    // S3 Buckets
    (async () => {
      const client = new S3Client({ region, credentials });
      const resp = await client.send(new ListBucketsCommand({}));
      for (const bucket of resp.Buckets || []) {
        resources.push({
          id: bucket.Name || "",
          name: bucket.Name || "Unknown",
          type: "storage",
          icon: "💾",
          service: "S3",
          region: "global",
          status: "active",
          details: {
            created: bucket.CreationDate?.toISOString() || "",
          },
          consoleUrl: `https://s3.console.aws.amazon.com/s3/buckets/${bucket.Name}`,
        });
      }
    })(),

    // DynamoDB Tables
    (async () => {
      const client = new DynamoDBClient({ region, credentials });
      const resp = await client.send(new ListTablesCommand({}));
      for (const table of resp.TableNames || []) {
        resources.push({
          id: table,
          name: table,
          type: "database",
          icon: "🗄️",
          service: "DynamoDB",
          region: region,
          status: "active",
          details: {},
          consoleUrl: `https://${region}.console.aws.amazon.com/dynamodbv2/home?region=${region}#table?name=${table}`,
        });
      }
    })(),

    // RDS Instances
    (async () => {
      const client = new RDSClient({ region, credentials });
      const resp = await client.send(new DescribeDBInstancesCommand({}));
      for (const db of (resp.DBInstances || []) as DBInstance[]) {
        resources.push({
          id: db.DBInstanceArn || db.DBInstanceIdentifier || "",
          name: db.DBInstanceIdentifier || "Unknown",
          type: "database",
          icon: "🗄️",
          service: "RDS",
          region: region,
          status: db.DBInstanceStatus || "unknown",
          details: {
            engine: `${db.Engine || ""} ${db.EngineVersion || ""}`.trim(),
            instanceClass: db.DBInstanceClass || "",
            storage: `${db.AllocatedStorage || 0}GB`,
          },
          consoleUrl: `https://${region}.console.aws.amazon.com/rds/home?region=${region}#database:id=${db.DBInstanceIdentifier}`,
        });
      }
    })(),
  ]);

  // Collect errors
  for (const result of results) {
    if (result.status === "rejected") {
      errors.push(String(result.reason));
    }
  }

  return NextResponse.json({
    connected: true,
    region,
    resources,
    summary: {
      total: resources.length,
      functions: resources.filter((r) => r.type === "function").length,
      vms: resources.filter((r) => r.type === "vm").length,
      storage: resources.filter((r) => r.type === "storage").length,
      databases: resources.filter((r) => r.type === "database").length,
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
