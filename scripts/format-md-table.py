#!/usr/bin/env python3
"""
D2Coding 폰트에 맞게 마크다운 테이블을 정렬하는 스크립트

규칙:
- 파이프 사이의 모든 문자 너비 = 대시 개수
- 한글 1글자 = 2칸
- 영문 1글자 = 1칸
- 공백 1개 = 1칸
"""

import re
import sys
import unicodedata


def get_char_width(char):
    """문자의 너비를 계산 (한글=2, 영문/숫자/기호=1)"""
    if unicodedata.east_asian_width(char) in ('F', 'W'):
        return 2
    return 1


def get_text_width(text):
    """텍스트의 총 너비를 계산"""
    return sum(get_char_width(c) for c in text)


def parse_table_row(line):
    """테이블 행을 파싱하여 셀 내용 리스트 반환"""
    line = line.strip()
    if not line.startswith('|') or not line.endswith('|'):
        return None

    # 파이프로 분리
    cells = line[1:-1].split('|')
    return cells


def is_separator_row(cells):
    """구분선 행인지 확인"""
    for cell in cells:
        cell = cell.strip()
        if not re.match(r'^:?-+:?$', cell):
            return False
    return True


def format_table(table_lines):
    """테이블을 D2Coding 규칙에 맞게 정렬"""
    if len(table_lines) < 2:
        return table_lines

    # 모든 행 파싱
    parsed_rows = []
    separator_idx = -1

    for i, line in enumerate(table_lines):
        cells = parse_table_row(line)
        if cells is None:
            return table_lines  # 테이블이 아님

        if is_separator_row(cells):
            separator_idx = i
            parsed_rows.append(None)  # 구분선 위치 표시
        else:
            # 각 셀의 앞뒤 공백 제거
            parsed_rows.append([cell.strip() for cell in cells])

    if separator_idx == -1:
        return table_lines  # 구분선이 없음

    # 각 열의 최대 너비 계산
    num_cols = len(parsed_rows[0]) if parsed_rows[0] else 0
    max_widths = [0] * num_cols

    for row in parsed_rows:
        if row is None:  # 구분선
            continue
        for i, cell in enumerate(row):
            if i < num_cols:
                width = get_text_width(cell)
                max_widths[i] = max(max_widths[i], width)

    # 새로운 테이블 생성
    result = []
    for row in parsed_rows:
        if row is None:  # 구분선
            # 대시 개수 = 1(앞공백) + 최대너비 + 1(뒤공백)
            separator = '|' + '|'.join('-' * (w + 2) for w in max_widths) + '|'
            result.append(separator)
        else:
            # 각 셀을 정렬
            formatted_cells = []
            for i, cell in enumerate(row):
                if i < num_cols:
                    cell_width = get_text_width(cell)
                    padding = max_widths[i] - cell_width
                    # 앞 공백 1개 + 내용 + 뒤 공백 (패딩 + 1개)
                    formatted = ' ' + cell + ' ' * (padding + 1)
                    formatted_cells.append(formatted)
            result.append('|' + '|'.join(formatted_cells) + '|')

    return result


def format_markdown_tables(content):
    """마크다운 파일에서 모든 테이블을 찾아 정렬"""
    lines = content.split('\n')
    result = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # 테이블 시작 감지 (| 로 시작하는 행)
        if line.strip().startswith('|') and line.strip().endswith('|'):
            # 테이블 행들 수집
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i])
                i += 1

            # 테이블 정렬
            formatted = format_table(table_lines)
            result.extend(formatted)
        else:
            result.append(line)
            i += 1

    return '\n'.join(result)


def main():
    if len(sys.argv) < 2:
        print("Usage: python format-md-table.py <markdown_file>")
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        formatted = format_markdown_tables(content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(formatted)
        print(f"Formatted: {filepath}")

    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
