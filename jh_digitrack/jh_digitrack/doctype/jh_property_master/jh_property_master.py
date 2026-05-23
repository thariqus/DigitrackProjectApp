# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

from frappe.model.document import Document


def sanitize_multivalue_field(value):
	if not value:
		return value
	lines = [line.strip() for line in value.split("\n")]
	seen = set()
	result = []
	for line in lines:
		if line and line.lower() not in seen:
			seen.add(line.lower())
			result.append(line)
	return "\n".join(result)


class JHPropertyMaster(Document):

	def validate(self):
		self.premise_number = sanitize_multivalue_field(self.premise_number)
