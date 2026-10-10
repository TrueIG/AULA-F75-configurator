"use strict";

const RID = 0x13,
  CHUNK = 14,
  LED_SIZE = 128;
const FILTER = {
  vendorId: 0x3554,
  productId: 0xfa09,
  usagePage: 0xff02,
  usage: 0x02,
};
const CMD = {
  SET_MATRIX: 0x01,
  SET_COLORS: 0x02,
  SET_LED: 0x04,
  SET_RGBTAB: 0x09,
  GET_ONLINE: 0x07,
  GET_MATRIX: 0x41,
  GET_COLORS: 0x42,
  GET_LED: 0x44,
  GET_RGBTAB: 0x49,
  GET_STATUS: 0x4a,
  EVENT: 0x0a,
  REALTIME: 0x88,
};
const OFF = { CUSTOM: 0x09, MODE: 0x0a, SLEEP: 0x18, SLOTS: 0x3a };
const MODE_CUSTOM = 21,
  FN_TYPE = 0x0d,
  PACKET_GAP_MS = 10,
  RT_MAX = 200;
