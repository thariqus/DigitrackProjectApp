frappe.pages["jh-digitrack"].on_page_load = async function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: "JH Digitrack",
    single_column: true,
  });
  const main_section = $(wrapper).find(".layout-main-section");

  const splash_image = await frappe.db.get_value(
    "Website Settings",
    "Website Settings",
    "splash_image"
  );

  const imageSrc = splash_image.message.splash_image
    ? splash_image.message.splash_image
    : "/assets/frappe/images/frappe-framework-logo.png";

  main_section.html(
    `
			<style>
				@keyframes pulse {
					0%, 100% {
						opacity: 0.25;
					}
					50% {
						opacity: 1;
					}
				}
				.animate-pulse {
					animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
				}
			</style>
			<div style="
				height: calc(100svh - 124px); 
				display: flex; 
				align-items: center; 
				justify-content: center;
			">
					<img src="${imageSrc}" style="max-width: 100px; max-height: 100px;" class="animate-pulse">
			</div>
		`
  );

  window.location.href = "/jh-digitrack/tasks";
};
