export interface UserInfo {
  fullname: string;
  image: string | null;
  name: string;
  email: string;
  time_zone: string;
}

export interface AttachmentLog {
  name: string;
  creation: string;
  content: string;
  owner: string;
  comment_type: string;
}

export interface Attachment {
  name: string;
  file_name: string;
  file_url: string;
  is_private: number;
}

export interface DocPermissions {
  select: number;
  read: number;
  write: number;
  create: number;
  delete: number;
  submit: number;
  cancel: number;
  amend: number;
  print: number;
  email: number;
  report: number;
  import: number;
  export: number;
  share: number;
}

export interface DocInfo {
  user_info: {
    [user_name: string]: UserInfo;
  };
  comments: any[];
  shared: any[];
  assignment_logs: any[];
  attachment_logs: AttachmentLog[];
  info_logs: any[];
  like_logs: any[];
  workflow_logs: any[];
  doctype: string;
  name: string;
  attachments: Attachment[];
  communications: any[];
  automated_messages: any[];
  versions: any[];
  assignments: any[];
  permissions: DocPermissions;
  views: any[];
  energy_point_logs: any[];
  additional_timeline_content: any[];
  milestones: any[];
  is_document_followed: null;
  tags: string;
  document_email: null;
}

export interface DocResponse<T> {
  docs: T[];
  docinfo: DocInfo;
}
