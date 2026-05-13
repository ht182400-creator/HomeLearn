import { NextRequest, NextResponse } from "next/server";

// 年级列表（使用 Grade 枚举值）
const GRADES = [
  { id: "PRIMARY_1", name: "小学一年级", level: 1, description: "小学1年级" },
  { id: "PRIMARY_2", name: "小学二年级", level: 2, description: "小学2年级" },
  { id: "PRIMARY_3", name: "小学三年级", level: 3, description: "小学3年级" },
  { id: "PRIMARY_4", name: "小学四年级", level: 4, description: "小学4年级" },
  { id: "PRIMARY_5", name: "小学五年级", level: 5, description: "小学5年级" },
  { id: "PRIMARY_6", name: "小学六年级", level: 6, description: "小学6年级" },
  { id: "MIDDLE_1", name: "初一", level: 7, description: "初中一年级" },
  { id: "MIDDLE_2", name: "初二", level: 8, description: "初中二年级" },
  { id: "MIDDLE_3", name: "初三", level: 9, description: "初中三年级" },
  { id: "HIGH_1", name: "高一", level: 10, description: "高中一年级" },
  { id: "HIGH_2", name: "高二", level: 11, description: "高中二年级" },
  { id: "HIGH_3", name: "高三", level: 12, description: "高中三年级" },
];

// GET /api/questions/grades - 获取年级列表
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ grades: GRADES });
  } catch (error) {
    console.error("Failed to fetch grades:", error);
    return NextResponse.json(
      { error: "获取年级列表失败" },
      { status: 500 }
    );
  }
}
