export const HOST = 'pixeldrain.com';

export const API = `https://${HOST}/api`;

export const FILE_RE = new RegExp(`${HOST}/(?:u|d|api/file)/([a-zA-Z0-9]+)`, 'i');

export const LIST_RE = new RegExp(`${HOST}/(?:l|api/list)/([a-zA-Z0-9]+)`, 'i');

export const BARE_ID_RE = /^[a-zA-Z0-9]+$/;